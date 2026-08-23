import { initializeApp } from "firebase-admin/app";
import {
  DocumentData,
  DocumentReference,
  FieldValue,
  Firestore,
  Query,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { BatchResponse, getMessaging } from "firebase-admin/messaging";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import {
  AccessToken,
  RoomServiceClient,
  ServerError,
  TrackSource,
} from "livekit-server-sdk";

import {
  AlertCandidate,
  AlertReading,
  evaluateAlertCandidates,
} from "./alert_policy";
import { shouldSuppressAlertDedupe } from "./alert_dedupe";
import {
  AuthContextData,
  TankMemberRole,
  TankMembershipData,
  canEvaluateAlerts,
  hasGoogleSignInProvider,
  isTankActive,
  memberRole,
} from "./authorization";
import {
  liveKitHttpUrl,
  liveKitIdentity,
  liveKitIdentityDocumentId,
  liveKitTokenRevocationTimestamp,
} from "./livekit_service";
import {
  chunksOf,
  maxFirestoreBatchReads,
  maxFirestoreBatchWrites,
  maxMulticastTokens,
} from "./notification_batching";

initializeApp();

const REGION = "us-central1";
const livekitApiKey = defineSecret("LIVEKIT_API_KEY");
const livekitApiSecret = defineSecret("LIVEKIT_API_SECRET");
const livekitUrl = defineString("LIVEKIT_URL");

interface TankData extends TankMembershipData {
  thresholds?: unknown;
}

const DELETE_PAGE_SIZE = 250;
const LIVEKIT_TOKEN_TTL = "5m";

export const getLiveKitToken = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    secrets: [livekitApiKey, livekitApiSecret],
  },
  async (request) => {
    const uid = requireGoogleUid(request.auth);
    const tankId = requireTankId(request.data?.tankId);
    const requestedRole: TankMemberRole =
      request.data?.role === "monitor" ? "monitor" : "viewer";

    const snap = await getFirestore().collection("tanks").doc(tankId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Tank not found.");
    const tank = snap.data() as TankData;
    const membership = memberRole(tank, uid);
    if (membership === null) {
      throw new HttpsError("permission-denied", "Not a member of this tank.");
    }
    if (requestedRole === "monitor" && membership !== "monitor") {
      throw new HttpsError(
        "permission-denied",
        "Only the tank owner or a registered monitor may publish.",
      );
    }

    const identity = liveKitIdentity(tankId, uid, requestedRole);
    const token = new AccessToken(
      livekitApiKey.value(),
      livekitApiSecret.value(),
      {
        identity,
        ttl: LIVEKIT_TOKEN_TTL,
        metadata: JSON.stringify({ uid, tankId, role: requestedRole }),
      },
    );
    token.addGrant({
      roomJoin: true,
      room: tankId,
      canPublish: requestedRole === "monitor",
      canPublishData: false,
      canPublishSources:
        requestedRole === "monitor" ? [TrackSource.CAMERA] : [],
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    await registerLiveKitIdentity(
      getFirestore(),
      tankId,
      uid,
      requestedRole,
      identity,
    );

    return {
      token: jwt,
      url: livekitUrl.value(),
      role: requestedRole,
    };
  },
);

export const evaluateAlertConditions = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    const uid = requireGoogleUid(request.auth);
    const tankId = requireTankId(request.data?.tankId);
    const db = getFirestore();
    return evaluateTankAlerts(db, tankId, uid);
  },
);

/**
 * Server-triggered evaluation catches readings from devices that cannot call
 * the callable (for example after a temporary network handoff). Retry is
 * intentional: the evaluator is transactionally deduplicated by alert type.
 */
export const evaluateReadingAlertConditions = onDocumentCreated(
  {
    region: REGION,
    document: "readings/{readingId}",
    retry: true,
  },
  async (event) => {
    const tankId = stringValue(event.data?.data().tank_id);
    if (!tankId) {
      console.warn("[alerts] ignoring reading without tank_id", event.params.readingId);
      return;
    }
    await evaluateTankAlerts(getFirestore(), tankId);
  },
);

/**
 * Alert delivery is an outbox, not a side effect of the dedupe transaction.
 * Retried event delivery therefore remains independent of the two-hour alert
 * cooldown: a transient FCM error cannot make an already-created alert silent.
 */
export const dispatchAlertNotification = onDocumentCreated(
  {
    region: REGION,
    document: "notification_outbox/{outboxId}",
    retry: true,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    // CloudEvents retain their creation snapshot across retries. Always use
    // the current document state so a completed/cancelled retry is a no-op.
    const currentOutboxSnapshot = await snapshot.ref.get();
    if (!currentOutboxSnapshot.exists) return;
    const outbox = currentOutboxSnapshot.data();
    if (outbox == null) return;
    if (outbox.status === "sent" || outbox.status === "cancelled") return;
    const tankId = stringValue(outbox.tank_id);
    const alertId = stringValue(outbox.alert_id);
    const alert = alertCandidateFromOutbox(outbox);
    if (!tankId || !alertId || alert == null) {
      await updateOutboxIfPresent(snapshot.ref,
        { status: "cancelled", cancelled_at: FieldValue.serverTimestamp() },
      );
      return;
    }

    if (!await updateOutboxIfPresent(snapshot.ref,
      {
        status: "delivering",
        attempt_count: FieldValue.increment(1),
        last_attempt_at: FieldValue.serverTimestamp(),
      },
    )) return;
    // A deletion or a concurrent successful retry may have changed the
    // outbox after the attempt was recorded above.
    const beforeSendSnapshot = await snapshot.ref.get();
    if (!beforeSendSnapshot.exists) return;
    const beforeSendOutbox = beforeSendSnapshot.data();
    if (beforeSendOutbox == null) return;
    if (
      beforeSendOutbox.status === "sent" ||
      beforeSendOutbox.status === "cancelled"
    ) {
      return;
    }
    const freshTankId = stringValue(beforeSendOutbox.tank_id);
    const freshAlertId = stringValue(beforeSendOutbox.alert_id);
    const freshAlert = alertCandidateFromOutbox(beforeSendOutbox);
    if (!freshTankId || !freshAlertId || freshAlert == null) {
      await updateOutboxIfPresent(snapshot.ref,
        { status: "cancelled", cancelled_at: FieldValue.serverTimestamp() },
      );
      return;
    }
    const tankSnap = await getFirestore().collection("tanks").doc(freshTankId).get();
    if (!tankSnap.exists || !isTankActive(tankSnap.data() as TankData)) {
      await updateOutboxIfPresent(snapshot.ref,
        { status: "cancelled", cancelled_at: FieldValue.serverTimestamp() },
      );
      return;
    }
    try {
      await pushToMembers(
        tankSnap.data() as TankData,
        freshTankId,
        freshAlertId,
        freshAlert,
      );
      await updateOutboxIfPresent(snapshot.ref,
        {
          status: "sent",
          sent_at: FieldValue.serverTimestamp(),
          last_error: FieldValue.delete(),
        },
      );
    } catch (error) {
      const stillExists = await updateOutboxIfPresent(snapshot.ref,
        {
          status: "pending",
          last_error: error instanceof Error ? error.message : String(error),
        },
      );
      if (!stillExists) return;
      throw error;
    }
  },
);

async function evaluateTankAlerts(
  db: Firestore,
  tankId: string,
  actorUid?: string,
): Promise<{ created: string[] }> {
    const tankSnap = await db.collection("tanks").doc(tankId).get();
    if (!tankSnap.exists) {
      if (actorUid) throw new HttpsError("not-found", "Tank not found.");
      return { created: [] };
    }
    const tank = tankSnap.data() as TankData;
    if (!isTankActive(tank) || (actorUid && !canEvaluateAlerts(tank, actorUid))) {
      if (actorUid) {
        throw new HttpsError(
          "permission-denied",
          "Only the tank owner or a registered monitor may evaluate alerts.",
        );
      }
      return { created: [] };
    }

    const thresholds = asMap(tank.thresholds);
    const readingsSnap = await db
      .collection("readings")
      .where("tank_id", "==", tankId)
      .orderBy("timestamp", "desc")
      .limit(5)
      .get();
    const readings = readingsSnap.docs.map((doc): AlertReading => {
      const data = doc.data();
      return {
        clarityScore: numberValue(
          data.clarity_score ?? data.clarity,
          0,
        ),
        turbidityFnu: optionalNumber(data.turbidity_fnu),
        fishCount: Math.max(0, Math.round(numberValue(data.fish_count, 0))),
      };
    });

    const candidates = evaluateAlertCandidates(
      {
        clarityMin: numberValue(thresholds.clarity_min, 6),
        turbidityFnuMax: optionalNumber(thresholds.turbidity_fnu_max),
        fishChangePct: numberValue(thresholds.fish_change_pct, 50),
      },
      readings,
    );
    if (candidates.length === 0) return { created: [] };

    const legacyAlerts = await db
      .collection("alerts")
      .where("tank_id", "==", tankId)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();
    const now = Date.now();
    const created: string[] = [];
    let stopEvaluation = false;

    for (const candidate of candidates) {
      if (legacySuppressed(legacyAlerts.docs.map((doc) => doc.data()), candidate.type, now)) {
        continue;
      }
      const alertRef = db.collection("alerts").doc();
      const dedupeRef = db
        .collection("alert_dedupe")
        .doc(`${tankId}__${candidate.type}`);
      let didCreate = false;

      await db.runTransaction(async (transaction) => {
        // Firestore may retry this callback. Reset attempt-local state so a
        // losing concurrent evaluator never sends a duplicate notification.
        didCreate = false;
        stopEvaluation = false;
        const activeTank = await transaction.get(tankSnap.ref);
        if (
          !activeTank.exists ||
          !isTankActive(activeTank.data() as TankData) ||
          (actorUid != null && !canEvaluateAlerts(activeTank.data() as TankData, actorUid))
        ) {
          if (actorUid == null) {
            stopEvaluation = true;
            return;
          }
          throw new HttpsError(
            "permission-denied",
            "Alert evaluation is no longer authorized for this tank.",
          );
        }
        const marker = await transaction.get(dedupeRef);
        const markerData = marker.data();
        const activeAlertId = stringValue(markerData?.active_alert_id);
        let activeAlert: DocumentData | undefined;
        if (activeAlertId) {
          activeAlert = (
            await transaction.get(db.collection("alerts").doc(activeAlertId))
          ).data();
        }
        if (dedupeSuppressed(markerData, activeAlert, now)) return;

        transaction.create(alertRef, {
          tank_id: tankId,
          type: candidate.type,
          severity: candidate.severity,
          title: candidate.title,
          message: candidate.message,
          tip: candidate.tip,
          resolved: false,
          snoozed_until: null,
          timestamp: FieldValue.serverTimestamp(),
          context: candidate.context,
        });
        transaction.set(dedupeRef, {
          tank_id: tankId,
          type: candidate.type,
          active_alert_id: alertRef.id,
          last_raised_at: FieldValue.serverTimestamp(),
        });
        transaction.create(db.collection("notification_outbox").doc(alertRef.id), {
          tank_id: tankId,
          alert_id: alertRef.id,
          type: candidate.type,
          severity: candidate.severity,
          title: candidate.title,
          message: candidate.message,
          tip: candidate.tip,
          context: candidate.context,
          status: "pending",
          attempt_count: 0,
          created_at: FieldValue.serverTimestamp(),
        });
        didCreate = true;
      });

      if (stopEvaluation) return { created };
      if (!didCreate) continue;
      created.push(candidate.type);
    }

    return { created };
}

async function updateOutboxIfPresent(
  outboxRef: DocumentReference<DocumentData>,
  data: DocumentData,
): Promise<boolean> {
  try {
    await outboxRef.update(data);
    return true;
  } catch (error) {
    if (isFirestoreNotFound(error)) return false;
    throw error;
  }
}

function isFirestoreNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  return code === 5 || code === "not-found";
}

async function registerLiveKitIdentity(
  db: Firestore,
  tankId: string,
  uid: string,
  role: TankMemberRole,
  identity: string,
): Promise<void> {
  const tankRef = db.collection("tanks").doc(tankId);
  const identityRef = db
    .collection("livekit_identities")
    .doc(liveKitIdentityDocumentId(tankId, uid, role));
  await db.runTransaction(async (transaction) => {
    const tankSnap = await transaction.get(tankRef);
    const tank = tankSnap.data() as TankData | undefined;
    const membership = tank == null ? null : memberRole(tank, uid);
    if (
      !tankSnap.exists ||
      membership == null ||
      (role === "monitor" && membership !== "monitor")
    ) {
      throw new HttpsError(
        "permission-denied",
        "Live access is no longer authorized for this tank.",
      );
    }
    transaction.set(identityRef, {
      tank_id: tankId,
      uid,
      role,
      identity,
      updated_at: FieldValue.serverTimestamp(),
    });
  });
}

async function revokeStoredLiveKitIdentities(
  roomService: RoomServiceClient,
  db: Firestore,
  tankId: string,
): Promise<void> {
  const revokeTokenTs = liveKitTokenRevocationTimestamp();
  const query = db
    .collection("livekit_identities")
    .where("tank_id", "==", tankId);
  while (true) {
    const snapshot = await query.limit(DELETE_PAGE_SIZE).get();
    if (snapshot.empty) return;
    for (const document of snapshot.docs) {
      const identity = stringValue(document.data().identity);
      if (identity) {
        await removeLiveKitParticipantIfPresent(
          roomService,
          tankId,
          identity,
          revokeTokenTs,
        );
      }
    }
    const writer = db.bulkWriter();
    const operations = snapshot.docs.map((document) => writer.delete(document.ref));
    try {
      await Promise.all(operations);
    } finally {
      await writer.close();
    }
  }
}

async function removeLiveKitParticipantIfPresent(
  roomService: RoomServiceClient,
  tankId: string,
  identity: string,
  revokeTokenTs: bigint,
): Promise<void> {
  try {
    await roomService.removeParticipant(tankId, identity, { revokeTokenTs });
  } catch (error) {
    if (!(error instanceof ServerError && error.status === 404)) throw error;
  }
}

function alertCandidateFromOutbox(
  data: DocumentData,
): AlertCandidate | null {
  const type = stringValue(data.type);
  const severity = stringValue(data.severity);
  const title = stringValue(data.title);
  const message = stringValue(data.message);
  const tip = stringValue(data.tip);
  if (
    (type !== "clarity_low" && type !== "fish_zero" && type !== "fish_drop") ||
    (severity !== "warning" && severity !== "critical") ||
    !title ||
    !message ||
    !tip
  ) {
    return null;
  }
  const context = asMap(data.context);
  return {
    type,
    severity,
    title,
    message,
    tip,
    context: Object.fromEntries(
      Object.entries(context).filter(([, value]) =>
        typeof value === "number" && Number.isFinite(value)
      ),
    ) as Record<string, number>,
  };
}

/**
 * Owner-only server cascade. Client rules intentionally forbid deleting
 * alerts/dedupe state, so tank deletion must never be assembled client-side.
 */
export const deleteTank = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 540,
    memory: "512MiB",
    secrets: [livekitApiKey, livekitApiSecret],
  },
  async (request) => {
    const uid = requireGoogleUid(request.auth);
    const tankId = requireTankId(request.data?.tankId);
    const db = getFirestore();
    const tankRef = db.collection("tanks").doc(tankId);
    await db.runTransaction(async (transaction) => {
      const tankSnap = await transaction.get(tankRef);
      if (!tankSnap.exists) {
        throw new HttpsError("not-found", "Tank not found.");
      }
      const tank = tankSnap.data() as TankData;
      if (tank.owner_id !== uid) {
        throw new HttpsError(
          "permission-denied",
          "Only the tank owner may delete this tank.",
        );
      }
      if (tank.deleting_at == null) {
        transaction.update(tankRef, {
          deleting_at: FieldValue.serverTimestamp(),
        });
      }
    });

    const roomService = new RoomServiceClient(
      liveKitHttpUrl(livekitUrl.value()),
      livekitApiKey.value(),
      livekitApiSecret.value(),
    );
    // Stop camera delivery immediately; the Firestore cascade may require
    // multiple bounded pages or a later retry for a long-lived tank.
    await revokeStoredLiveKitIdentities(roomService, db, tankId);
    await deleteLiveKitRoomIfPresent(roomService, tankId);

    const linkedCollections = [
      "readings",
      "tank_fish",
      "alerts",
      "alert_dedupe",
      "notification_outbox",
      "livekit_identities",
    ];
    let deletedDocuments = 0;
    for (const collection of linkedCollections) {
      deletedDocuments += await deleteQueryPages(
        db,
        db.collection(collection).where("tank_id", "==", tankId),
      );
    }
    const liveStateRef = db.collection("live_state").doc(tankId);
    deletedDocuments += await deleteQueryPages(
      db,
      liveStateRef.collection("requests"),
    );
    await removeTankFromLinkedUsers(db, tankId);

    // The tombstone prevents new client writes. Keep the authorization record
    // until every dependent operation has succeeded so a failed invocation is
    // safe to retry by the same owner.
    // A pre-tombstone token may have connected during cleanup, so terminate
    // the room again immediately before deleting the authorization record.
    await deleteLiveKitRoomIfPresent(roomService, tankId);
    await liveStateRef.delete();
    await tankRef.delete();
    return { deleted: true, deletedDocuments };
  },
);

async function deleteLiveKitRoomIfPresent(
  roomService: RoomServiceClient,
  tankId: string,
): Promise<void> {
  try {
    await roomService.deleteRoom(tankId);
  } catch (error) {
    if (!(error instanceof ServerError && error.status === 404)) throw error;
  }
}

async function deleteQueryPages(
  db: Firestore,
  query: Query<DocumentData>,
): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(DELETE_PAGE_SIZE).get();
    if (snapshot.empty) return deleted;
    const writer = db.bulkWriter();
    const operations = snapshot.docs.map((document) =>
      writer.delete(document.ref)
    );
    try {
      await Promise.all(operations);
    } finally {
      await writer.close();
    }
    deleted += snapshot.size;
  }
}

async function removeTankFromLinkedUsers(
  db: Firestore,
  tankId: string,
): Promise<void> {
  const query = db.collection("users").where("tanks", "array-contains", tankId);
  while (true) {
    const snapshot = await query.limit(DELETE_PAGE_SIZE).get();
    if (snapshot.empty) return;
    const writer = db.bulkWriter();
    const operations = snapshot.docs.map((document) =>
      writer.set(
        document.ref,
        {
          tanks: FieldValue.arrayRemove(tankId),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    );
    try {
      await Promise.all(operations);
    } finally {
      await writer.close();
    }
  }
}

function requireGoogleUid(
  auth: AuthContextData | undefined,
): string {
  if (typeof auth?.uid !== "string" || auth.uid.length === 0) {
    throw new HttpsError("unauthenticated", "Google sign-in required.");
  }
  if (!hasGoogleSignInProvider(auth)) {
    throw new HttpsError(
      "permission-denied",
      "Only Google-authenticated accounts may use OceanEyes.",
    );
  }
  return auth.uid;
}

function requireTankId(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "tankId is required.");
  }
  const tankId = value.trim();
  if (
    tankId.length === 0 ||
    tankId === "." ||
    tankId === ".." ||
    tankId.includes("/") ||
    /^__.*__$/.test(tankId) ||
    Buffer.byteLength(tankId, "utf8") > 1500
  ) {
    throw new HttpsError("invalid-argument", "tankId is invalid.");
  }
  return tankId;
}

function legacySuppressed(
  alerts: readonly DocumentData[],
  type: string,
  now: number,
): boolean {
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  return alerts.some((alert) => {
    if (alert.type !== type) return false;
    const snoozedUntil = timestampMillis(alert.snoozed_until);
    if (snoozedUntil > now) return true;
    return alert.resolved !== true && timestampMillis(alert.timestamp) > twoHoursAgo;
  });
}

function dedupeSuppressed(
  marker: DocumentData | undefined,
  activeAlert: DocumentData | undefined,
  now: number,
): boolean {
  return shouldSuppressAlertDedupe(
    {
      markerExists: marker != null,
      lastRaisedAtMillis: timestampMillis(marker?.last_raised_at),
      snoozedUntilMillis: timestampMillis(activeAlert?.snoozed_until),
    },
    now,
  );
}

async function pushToMembers(
  tank: TankData,
  tankId: string,
  alertId: string,
  alert: AlertCandidate,
): Promise<void> {
  const memberUids = [
    stringValue(tank.owner_id),
    ...stringArray(tank.monitor_uids),
    ...stringArray(tank.viewers),
  ].filter((uid, index, all) => uid.length > 0 && all.indexOf(uid) === index);
  if (memberUids.length === 0) return;

  const db = getFirestore();
  const docs = [];
  for (const memberChunk of chunksOf(memberUids, maxFirestoreBatchReads)) {
    docs.push(
      ...await db.getAll(
        ...memberChunk.map((uid) => db.collection("users").doc(uid)),
      ),
    );
  }
  const tokenOwners = new Map<string, Set<string>>();
  const legacyTokenByUid = new Map<string, string>();
  for (const doc of docs) {
    const data = doc.data();
    if (!data) continue;
    const legacyToken = stringValue(data.fcm_token);
    if (legacyToken) legacyTokenByUid.set(doc.id, legacyToken);
    const tokens = new Set([
      ...stringArray(data.fcm_tokens),
      legacyToken,
    ]);
    for (const token of tokens) {
      if (!token) continue;
      const owners = tokenOwners.get(token) ?? new Set<string>();
      owners.add(doc.id);
      tokenOwners.set(token, owners);
    }
  }
  const tokens = [...tokenOwners.keys()];
  if (tokens.length === 0) return;

  const invalidTokens: string[] = [];
  const retryableTokenErrors: string[] = [];
  let multicastFailure: unknown;
  for (const tokenChunk of chunksOf(tokens, maxMulticastTokens)) {
    let response: BatchResponse;
    try {
      response = await getMessaging().sendEachForMulticast({
        tokens: tokenChunk,
        notification: { title: alert.title, body: alert.message },
        data: { tank_id: tankId, alert_id: alertId, type: alert.type },
      });
    } catch (error) {
      console.error("[push] multicast chunk failed", error);
      multicastFailure = error;
      break;
    }

    for (const [index, result] of response.responses.entries()) {
      if (!result.error) continue;
      const code = result.error.code || "messaging/unknown-error";
      const token = tokenChunk[index];
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(token);
      } else {
        // FCM registration tokens are bearer credentials. Retain only the
        // provider code in server/outbox diagnostics, never the token value.
        retryableTokenErrors.push(code);
      }
    }
  }

  if (invalidTokens.length > 0) {
    for (const memberChunk of chunksOf(memberUids, maxFirestoreBatchWrites)) {
      const batch = db.batch();
      let writes = 0;
      for (const uid of memberChunk) {
        const ownedInvalid = invalidTokens.filter((token) =>
          tokenOwners.get(token)?.has(uid),
        );
        if (ownedInvalid.length === 0) continue;
        const update: DocumentData = {
          fcm_tokens: FieldValue.arrayRemove(...ownedInvalid),
        };
        if (ownedInvalid.includes(legacyTokenByUid.get(uid) ?? "")) {
          update.fcm_token = FieldValue.delete();
        }
        batch.set(
          db.collection("users").doc(uid),
          update,
          { merge: true },
        );
        writes += 1;
      }
      if (writes > 0) await batch.commit();
    }
  }
  // Cleanup is deliberately completed first. Invalid tokens should not make a
  // retryable provider response permanently poison every later attempt.
  if (multicastFailure != null) throw multicastFailure;
  if (retryableTokenErrors.length > 0) {
    throw new Error(
      `FCM rejected ${retryableTokenErrors.length} token(s): ${retryableTokenErrors.join(", ")}`,
    );
  }
}

function asMap(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function timestampMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}
