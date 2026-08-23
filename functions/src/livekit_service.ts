import { createHash } from "node:crypto";

export function liveKitHttpUrl(value: string): string {
  const configured = value.trim();
  if (configured.startsWith("wss://")) {
    return `https://${configured.substring("wss://".length)}`;
  }
  if (configured.startsWith("ws://")) {
    return `http://${configured.substring("ws://".length)}`;
  }
  if (configured.startsWith("https://") || configured.startsWith("http://")) {
    return configured;
  }
  throw new Error("LIVEKIT_URL must use ws://, wss://, http://, or https://.");
}

/**
 * One participant identity per tank/user/role keeps refreshes and reconnects
 * from accumulating untracked LiveKit participants. The values are persisted
 * by the token callable so deleteTank can explicitly revoke them before the
 * room is removed.
 */
export function liveKitIdentity(
  tankId: string,
  uid: string,
  role: "viewer" | "monitor",
): string {
  // LiveKit identities have a finite byte limit while Firestore tank IDs may
  // be much longer. A prefixed SHA-256 digest stays well below that limit and
  // remains deterministic across every token refresh.
  return `oe_${identityDigest(tankId, uid, role)}`;
}

export function liveKitIdentityDocumentId(
  tankId: string,
  uid: string,
  role: "viewer" | "monitor",
): string {
  return identityDigest(tankId, uid, role);
}

/** A next-second boundary revokes every token that could already be issued. */
export function liveKitTokenRevocationTimestamp(nowMillis = Date.now()): bigint {
  return BigInt(Math.floor(nowMillis / 1000) + 1);
}

function identityDigest(
  tankId: string,
  uid: string,
  role: "viewer" | "monitor",
): string {
  return createHash("sha256")
    .update(tankId)
    .update("\u0000")
    .update(uid)
    .update("\u0000")
    .update(role)
    .digest("base64url");
}
