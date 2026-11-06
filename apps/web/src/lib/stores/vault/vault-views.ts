import type { EntityStore } from "./entity-store.svelte";
import type { GuestVaultStore } from "../guest-vault.svelte";
import type { mapRegistry } from "../map-registry.svelte";
import type { canvasRegistry } from "../canvas-registry.svelte";
import type { vaultRegistry } from "../vault-registry.svelte";

interface VaultViewDependencies {
  entityStore: () => Pick<
    EntityStore,
    | "entities"
    | "allEntities"
    | "graphEntities"
    | "graphStructureVersion"
    | "titleAndAliasIndex"
    | "inboundConnections"
    | "labelIndex"
    | "labelCounts"
  >;
  mode: { isGuestMode: boolean };
  guest: Pick<
    GuestVaultStore,
    | "entities"
    | "entitiesMap"
    | "relationships"
    | "maps"
    | "canvases"
    | "publishId"
    | "vaultTitle"
  >;
  maps: Pick<typeof mapRegistry, "maps" | "allMaps">;
  canvases: Pick<typeof canvasRegistry, "canvases">;
  registry: Pick<
    typeof vaultRegistry,
    "activeVaultId" | "activeVaultRecord" | "vaultName"
  >;
}

/** Read models select the current host or guest data without caching reactive state. */
export class VaultViews {
  constructor(private deps: VaultViewDependencies) {}
  get entities() {
    if (this.deps.mode.isGuestMode) {
      return {
        ...this.deps.guest.entitiesMap,
        ...this.deps.entityStore().entities,
      };
    }
    return this.deps.entityStore().entities;
  }
  get allEntities() {
    if (this.deps.mode.isGuestMode) {
      const allEnts = this.deps.entityStore().allEntities;
      const extraEntities: typeof allEnts = [];
      for (let i = 0; i < allEnts.length; i++) {
        const e = allEnts[i];
        if (!this.deps.guest.entitiesMap[e.id]) extraEntities.push(e);
      }
      return this.deps.guest.entities.concat(extraEntities);
    }
    return this.deps.entityStore().allEntities;
  }
  get graphEntities() {
    if (this.deps.mode.isGuestMode) {
      return this.deps.guest.entities;
    }
    return this.deps.entityStore().graphEntities;
  }
  get graphStructureVersion() {
    if (this.deps.mode.isGuestMode) {
      return this.deps.guest.entities.length;
    }
    return this.deps.entityStore().graphStructureVersion;
  }
  get titleAndAliasIndex() {
    if (this.deps.mode.isGuestMode) {
      const result: Array<{
        lowercaseText: string;
        entityId: string;
        actualTitle: string;
        isAlias: boolean;
        visibility?: string;
        labels?: string[];
        status: string;
      }> = [];
      for (const entity of this.deps.guest.entities) {
        const entry = {
          entityId: entity.id,
          actualTitle: entity.title,
          visibility: entity.visibility,
          labels: entity.labels,
          status: entity.status || "active",
        };
        result.push({
          ...entry,
          lowercaseText: entity.title.toLowerCase(),
          isAlias: false,
        });
        for (const alias of entity.aliases || []) {
          if (!alias) continue;
          result.push({
            ...entry,
            lowercaseText: alias.toLowerCase(),
            isAlias: true,
          });
        }
      }
      return result.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }
    return this.deps.entityStore().titleAndAliasIndex;
  }
  get inboundConnections() {
    if (this.deps.mode.isGuestMode) {
      const newInboundMap: Record<
        string,
        { sourceId: string; connection: any }[]
      > = Object.create(null);
      for (const rel of this.deps.guest.relationships) {
        if (!newInboundMap[rel.targetId]) {
          newInboundMap[rel.targetId] = [];
        }
        newInboundMap[rel.targetId].push({
          sourceId: rel.sourceId,
          connection: {
            target: rel.targetId,
            type: rel.label || "neutral",
            label: rel.label,
          },
        });
      }
      return newInboundMap;
    }
    return this.deps.entityStore().inboundConnections;
  }
  get labelIndex() {
    if (this.deps.mode.isGuestMode) {
      const labels = new Set<string>();
      for (const e of this.deps.guest.entities) {
        if (e.labels) {
          for (const l of e.labels) {
            labels.add(l);
          }
        }
      }
      return Array.from(labels).sort();
    }
    return this.deps.entityStore().labelIndex;
  }
  get labelCounts() {
    if (this.deps.mode.isGuestMode) {
      const counts: Record<string, number> = {};
      for (const e of this.deps.guest.entities) {
        if (e.labels) {
          const uniqueLabels = new Set(e.labels);
          for (const l of uniqueLabels) {
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }
      return counts;
    }
    return this.deps.entityStore().labelCounts;
  }
  get maps() {
    if (this.deps.mode.isGuestMode) {
      return indexById(this.deps.guest.maps);
    }
    return this.deps.maps.maps;
  }
  get allMaps() {
    if (this.deps.mode.isGuestMode) {
      return this.deps.guest.maps;
    }
    return this.deps.maps.allMaps;
  }
  get canvases() {
    if (this.deps.mode.isGuestMode) {
      return indexById(this.deps.guest.canvases);
    }
    return this.deps.canvases.canvases;
  }
  get activeVaultId() {
    if (this.deps.mode.isGuestMode) {
      return this.deps.guest.publishId;
    }
    return this.deps.registry.activeVaultId;
  }
  get activeVaultRecord() {
    return this.deps.registry.activeVaultRecord;
  }
  get vaultName() {
    if (this.deps.mode.isGuestMode) {
      return this.deps.guest.vaultTitle;
    }
    return this.deps.registry.vaultName;
  }
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  const record: Record<string, T> = Object.create(null);
  for (const item of items) record[item.id] = item;
  return record;
}
