export interface TankMembershipData {
  owner_id?: unknown;
  viewers?: unknown;
  monitor_uids?: unknown;
  deleting_at?: unknown;
}

export type TankMemberRole = "viewer" | "monitor";

export function memberRole(
  tank: TankMembershipData,
  uid: string,
): TankMemberRole | null {
  if (!isTankActive(tank)) return null;
  if (
    tank.owner_id === uid ||
    stringArray(tank.monitor_uids).includes(uid)
  ) {
    return "monitor";
  }
  if (stringArray(tank.viewers).includes(uid)) return "viewer";
  return null;
}

export function isTankActive(tank: TankMembershipData): boolean {
  return tank.deleting_at == null;
}

export function canEvaluateAlerts(
  tank: TankMembershipData,
  uid: string,
): boolean {
  return memberRole(tank, uid) === "monitor";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
