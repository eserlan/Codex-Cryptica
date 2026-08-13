import type { LocalEntity } from "./types";

export function isGraphRelevantEntityChange(
  oldEntity: LocalEntity,
  newEntity: LocalEntity,
): boolean {
  if (oldEntity.id !== newEntity.id) return true;
  if (oldEntity.title !== newEntity.title) return true;
  if (oldEntity.type !== newEntity.type) return true;
  if (oldEntity.status !== newEntity.status) return true;
  if (oldEntity.visibility !== newEntity.visibility) return true;
  if (oldEntity.parent !== newEntity.parent) return true;
  if (oldEntity.image !== newEntity.image) return true;
  if (oldEntity.thumbnail !== newEntity.thumbnail) return true;

  if (!stringArrayEqual(oldEntity.labels, newEntity.labels)) return true;
  if (!stringArrayEqual(oldEntity.tags, newEntity.tags)) return true;
  if (!stringArrayEqual(oldEntity.aliases, newEntity.aliases)) return true;
  if (!connectionsEqual(oldEntity.connections, newEntity.connections))
    return true;
  if (!temporalEqual(oldEntity.date, newEntity.date)) return true;
  if (!temporalEqual(oldEntity.start_date, newEntity.start_date)) return true;
  if (!temporalEqual(oldEntity.end_date, newEntity.end_date)) return true;
  if (!coordinatesEqual(oldEntity.metadata, newEntity.metadata)) return true;
  if (
    (oldEntity as any).guestChatConfig?.isEnabled !==
    (newEntity as any).guestChatConfig?.isEnabled
  ) {
    return true;
  }

  return false;
}

export function stringArrayEqual(a?: string[], b?: string[]): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function connectionsEqual(a: any[] = [], b: any[] = []): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i] ?? {};
    const right = b[i] ?? {};
    if (
      left.target !== right.target ||
      left.type !== right.type ||
      left.label !== right.label ||
      left.strength !== right.strength
    ) {
      return false;
    }
  }
  return true;
}

export function temporalEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.label === b.label
  );
}

export function coordinatesEqual(a: any, b: any): boolean {
  const left = a?.coordinates;
  const right = b?.coordinates;
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  return left.x === right.x && left.y === right.y;
}
