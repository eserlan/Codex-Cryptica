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
  // Both decide what a node paints when it has no portrait, or how a portrait
  // is framed inside it — a change to either has to reach the graph, or the
  // node keeps rendering the previous artwork.
  if (oldEntity.silhouette !== newEntity.silhouette) return true;
  if (oldEntity.imageFocus !== newEntity.imageFocus) return true;

  if (!stringArrayEqual(oldEntity.labels, newEntity.labels)) return true;
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

const CONNECTION_KEYS = ["target", "type", "label", "strength"] as const;

function connectionEqual(left: any = {}, right: any = {}): boolean {
  return (
    CONNECTION_KEYS.every((key) => left[key] === right[key]) &&
    Boolean(left.hidden) === Boolean(right.hidden)
  );
}

export function connectionsEqual(a: any[] = [], b: any[] = []): boolean {
  return a.length === b.length && a.every((c, i) => connectionEqual(c, b[i]));
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
