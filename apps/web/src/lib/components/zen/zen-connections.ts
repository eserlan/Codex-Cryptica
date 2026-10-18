import { isEntityVisible, type Entity } from "schema";

export interface ConnectionListItem {
  id: string;
  key: string;
  displayLabel: string;
  rawLabel?: string;
  title: string;
  type: string;
  isOutbound: boolean;
  isChild?: boolean;
  isParent?: boolean;
  strength?: number;
}

export type VisibilityChecker = (targetId: string) => boolean;

export function createVisibilityChecker(vault: any): VisibilityChecker {
  return (targetId: string): boolean => {
    const targetEntity = vault.entities?.[targetId];
    if (!targetEntity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(targetEntity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  };
}

export function getOutboundConnections(
  entity: Entity,
  vault: any,
  checkVisibility: VisibilityChecker,
): ConnectionListItem[] {
  const result: ConnectionListItem[] = [];
  const connections = entity.connections || [];
  const len = connections.length;
  for (let i = 0; i < len; i++) {
    const c = connections[i];
    if (checkVisibility(c.target)) {
      result.push({
        id: c.target,
        key: `${c.target}-out-${c.type}-${i}`,
        displayLabel: c.label || c.type,
        rawLabel: c.label,
        title: vault.entities?.[c.target]?.title || c.target,
        type: c.type,
        isOutbound: true,
        strength: c.strength,
      });
    }
  }
  return result;
}

export function getInboundConnections(
  entity: Entity,
  vault: any,
  checkVisibility: VisibilityChecker,
): ConnectionListItem[] {
  const result: ConnectionListItem[] = [];
  const inbound = vault.inboundConnections?.[entity.id || ""] || [];
  const len = inbound.length;
  for (let i = 0; i < len; i++) {
    const item = inbound[i];
    if (checkVisibility(item.sourceId)) {
      result.push({
        id: item.sourceId,
        key: `${item.sourceId}-in-${item.connection.type}-${i}`,
        displayLabel: item.connection.label || item.connection.type,
        rawLabel: item.connection.label,
        title: vault.entities?.[item.sourceId]?.title || item.sourceId,
        type: item.connection.type,
        isOutbound: false,
        strength: item.connection.strength,
      });
    }
  }
  return result;
}

export function getChildConnections(
  entity: Entity,
  vault: any,
  checkVisibility: VisibilityChecker,
  existingIds: Set<string>,
): ConnectionListItem[] {
  const result: ConnectionListItem[] = [];
  const entityId = (entity.id || "").toLowerCase();
  const allEntities = vault.allEntities || [];
  const len = allEntities.length;

  for (let i = 0; i < len; i++) {
    const child = allEntities[i];
    if (child.parent && child.parent.toLowerCase() === entityId) {
      if (checkVisibility(child.id) && !existingIds.has(child.id)) {
        result.push({
          id: child.id,
          key: `${child.id}-child-${i}`,
          displayLabel: "Child",
          rawLabel: "Child",
          title: child.title,
          type: "child",
          isOutbound: false,
          isChild: true,
        });
      }
    }
  }
  return result;
}

export function buildZenConnections(
  entity: Entity | null | undefined,
  vault: any,
): ConnectionListItem[] {
  if (!entity) return [];

  const checkVisibility = createVisibilityChecker(vault);
  const outbound = getOutboundConnections(entity, vault, checkVisibility);
  const inbound = getInboundConnections(entity, vault, checkVisibility);

  const existingIds = new Set<string>();
  for (let i = 0; i < outbound.length; i++) existingIds.add(outbound[i].id);
  for (let i = 0; i < inbound.length; i++) existingIds.add(inbound[i].id);

  const children = getChildConnections(
    entity,
    vault,
    checkVisibility,
    existingIds,
  );

  return [...outbound, ...inbound, ...children];
}
