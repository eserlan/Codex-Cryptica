import type { LocalEntity } from "./types";
import { isGraphRelevantEntityChange } from "./entity-equality";

export interface TitleAndAliasIndexEntry {
  lowercaseText: string;
  entityId: string;
  actualTitle: string;
  isAlias: boolean;
  visibility?: string;
  labels?: string[];
  status: string;
}

/**
 * Owns the secondary indexes derived from the entity map (label/title/alias
 * lookups, parent-child mapping, graph-relevant entity list). Rebuilds are
 * O(n) over all entities; incremental add/update/delete paths keep those
 * indexes in sync without a full rebuild on every entity mutation.
 */
export class EntityIndexMaintainer {
  allEntities = $state<LocalEntity[]>([]);
  allActiveEntities = $state<LocalEntity[]>([]);
  graphEntities = $state<LocalEntity[]>([]);
  graphStructureVersion = $state(0);
  parentToChildren = $state<Record<string, string[]>>({});
  labelIndex = $state<string[]>([]);
  labelCounts = $state<Record<string, number>>({});
  titleAndAliasIndex = $state<TitleAndAliasIndexEntry[]>([]);

  rebuildIndexes(entities: Record<string, LocalEntity>) {
    const all = Object.values(entities);

    this.allEntities = all;
    this.allActiveEntities = all.filter((e) => e.status !== "draft");
    this.graphEntities = [...all];
    this.bumpGraphStructureVersion();

    const parentMap: Record<string, string[]> = {};
    const labelsSet = new Set<string>();
    const counts: Record<string, number> = {};
    const titleAndAlias: TitleAndAliasIndexEntry[] = [];

    for (let i = 0; i < all.length; i++) {
      const entity = all[i];

      // Parent to children mapping
      if (entity.parent) {
        if (!parentMap[entity.parent]) {
          parentMap[entity.parent] = [];
        }
        parentMap[entity.parent].push(entity.id);
      }

      // Label index and counts
      if (entity.labels) {
        const isDraft = entity.status === "draft";
        for (let j = 0; j < entity.labels.length; j++) {
          labelsSet.add(entity.labels[j]);
        }
        if (!isDraft) {
          const uniqueLabels = new Set(entity.labels);
          for (const l of uniqueLabels) {
            counts[l] = (counts[l] || 0) + 1;
          }
        }
      }

      // Title matching index
      if (entity.title) {
        titleAndAlias.push({
          lowercaseText: entity.title.toLowerCase(),
          entityId: entity.id,
          actualTitle: entity.title,
          isAlias: false,
          visibility: entity.visibility,
          labels: entity.labels,
          status: entity.status || "active",
        });
      }

      // Alias matching index
      if (entity.aliases && Array.isArray(entity.aliases)) {
        for (let j = 0; j < entity.aliases.length; j++) {
          const alias = entity.aliases[j];
          if (alias) {
            titleAndAlias.push({
              lowercaseText: alias.toLowerCase(),
              entityId: entity.id,
              actualTitle: entity.title,
              isAlias: true,
              visibility: entity.visibility,
              labels: entity.labels,
              status: entity.status || "active",
            });
          }
        }
      }
    }

    this.parentToChildren = parentMap;
    this.labelIndex = Array.from(labelsSet).sort();
    this.labelCounts = counts;
    this.titleAndAliasIndex = titleAndAlias.sort(
      (a, b) => b.lowercaseText.length - a.lowercaseText.length,
    );
  }

  handleEntitiesUpdate(
    oldMap: Record<string, LocalEntity>,
    newMap: Record<string, LocalEntity>,
  ) {
    const oldKeys = Object.keys(oldMap);
    const newKeys = Object.keys(newMap);

    // If either map is completely empty, do a full rebuild.
    if (oldKeys.length === 0 || newKeys.length === 0) {
      this.rebuildIndexes(newMap);
      return;
    }

    // Detect deleted entities
    for (let i = 0; i < oldKeys.length; i++) {
      const id = oldKeys[i];
      if (!newMap[id]) {
        this.incrementalDelete(oldMap[id]);
      }
    }

    // Detect added or modified entities
    for (let i = 0; i < newKeys.length; i++) {
      const id = newKeys[i];
      const oldEnt = oldMap[id];
      const newEnt = newMap[id];

      if (!oldEnt) {
        this.incrementalAdd(newEnt);
      } else if (oldEnt !== newEnt) {
        // Compare only index-relevant fields to detect if a heavy re-indexing is required.
        const titleChanged = oldEnt.title !== newEnt.title;
        const aliasesChanged =
          JSON.stringify(oldEnt.aliases) !== JSON.stringify(newEnt.aliases);
        const labelsChanged =
          JSON.stringify(oldEnt.labels) !== JSON.stringify(newEnt.labels);
        const parentChanged = oldEnt.parent !== newEnt.parent;
        const statusChanged = oldEnt.status !== newEnt.status;
        const visibilityChanged = oldEnt.visibility !== newEnt.visibility;

        const graphChanged = isGraphRelevantEntityChange(oldEnt, newEnt);

        if (
          titleChanged ||
          aliasesChanged ||
          labelsChanged ||
          parentChanged ||
          statusChanged ||
          visibilityChanged
        ) {
          this.incrementalUpdate(oldEnt, newEnt);
        } else {
          // Cold content or timestamp update path (e.g. keystroke inside editor).
          // Replace the array identity so derived graph elements resync for
          // connection-only updates without rebuilding all secondary indexes.
          const idx = this.allEntities.findIndex((e) => e.id === id);
          if (idx !== -1) {
            const nextAllEntities = [...this.allEntities];
            nextAllEntities[idx] = newEnt;
            this.allEntities = nextAllEntities;
          }
          if (newEnt.status !== "draft") {
            const activeIdx = this.allActiveEntities.findIndex(
              (e) => e.id === id,
            );
            if (activeIdx !== -1) {
              const nextActiveEntities = [...this.allActiveEntities];
              nextActiveEntities[activeIdx] = newEnt;
              this.allActiveEntities = nextActiveEntities;
            }
          }

          if (graphChanged) {
            this.patchGraphEntity(newEnt);
          }
        }
      }
    }
  }

  private incrementalAdd(entity: LocalEntity) {
    const id = entity.id;

    this.allEntities.push(entity);
    this.graphEntities.push(entity);
    this.bumpGraphStructureVersion();
    if (entity.status !== "draft") {
      this.allActiveEntities.push(entity);
    }

    if (entity.parent) {
      if (!this.parentToChildren[entity.parent]) {
        this.parentToChildren[entity.parent] = [];
      }
      if (!this.parentToChildren[entity.parent].includes(id)) {
        this.parentToChildren[entity.parent].push(id);
      }
    }

    let addedToTitleIndex = false;
    if (entity.title) {
      this.titleAndAliasIndex.push({
        lowercaseText: entity.title.toLowerCase(),
        entityId: entity.id,
        actualTitle: entity.title,
        isAlias: false,
        visibility: entity.visibility,
        labels: entity.labels,
        status: entity.status || "active",
      });
      addedToTitleIndex = true;
    }
    if (entity.aliases && Array.isArray(entity.aliases)) {
      for (let j = 0; j < entity.aliases.length; j++) {
        const alias = entity.aliases[j];
        if (alias) {
          this.titleAndAliasIndex.push({
            lowercaseText: alias.toLowerCase(),
            entityId: entity.id,
            actualTitle: entity.title,
            isAlias: true,
            visibility: entity.visibility,
            labels: entity.labels,
            status: entity.status || "active",
          });
          addedToTitleIndex = true;
        }
      }
    }
    if (addedToTitleIndex) {
      this.titleAndAliasIndex.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }

    if (entity.labels) {
      const isDraft = entity.status === "draft";
      let labelsAdded = false;
      const uniqueLabels = new Set(entity.labels);

      for (const l of uniqueLabels) {
        if (!this.labelIndex.includes(l)) {
          this.labelIndex.push(l);
          labelsAdded = true;
        }
        if (!isDraft) {
          this.labelCounts[l] = (this.labelCounts[l] || 0) + 1;
        }
      }

      if (labelsAdded) {
        this.labelIndex.sort();
      }
    }
  }

  private incrementalDelete(entity: LocalEntity) {
    const id = entity.id;

    this.allEntities = this.allEntities.filter((e) => e.id !== id);
    this.graphEntities = this.graphEntities.filter((e) => e.id !== id);
    this.bumpGraphStructureVersion();
    if (entity.status !== "draft") {
      this.allActiveEntities = this.allActiveEntities.filter(
        (e) => e.id !== id,
      );
    }

    if (entity.parent && this.parentToChildren[entity.parent]) {
      this.parentToChildren[entity.parent] = this.parentToChildren[
        entity.parent
      ].filter((cid) => cid !== id);
      if (this.parentToChildren[entity.parent].length === 0) {
        delete this.parentToChildren[entity.parent];
      }
    }
    if (this.parentToChildren[id]) {
      delete this.parentToChildren[id];
    }

    this.titleAndAliasIndex = this.titleAndAliasIndex.filter(
      (item) => item.entityId !== id,
    );

    if (entity.labels) {
      const isDraft = entity.status === "draft";
      const uniqueLabels = new Set(entity.labels);
      for (const l of uniqueLabels) {
        if (!isDraft && this.labelCounts[l] !== undefined) {
          this.labelCounts[l]--;
          if (this.labelCounts[l] <= 0) {
            delete this.labelCounts[l];
          }
        }
      }

      const remainingLabels = new Set<string>();
      for (let j = 0; j < this.allEntities.length; j++) {
        const e = this.allEntities[j];
        if (e.labels) {
          for (let k = 0; k < e.labels.length; k++) {
            remainingLabels.add(e.labels[k]);
          }
        }
      }
      this.labelIndex = Array.from(remainingLabels).sort();
    }
  }

  private incrementalUpdate(oldEntity: LocalEntity, newEntity: LocalEntity) {
    const id = newEntity.id;

    const idx = this.allEntities.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.allEntities[idx] = newEntity;
    } else {
      this.allEntities.push(newEntity);
    }
    this.patchGraphEntity(newEntity);

    const wasActive = oldEntity.status !== "draft";
    const isActive = newEntity.status !== "draft";

    if (wasActive && !isActive) {
      this.allActiveEntities = this.allActiveEntities.filter(
        (e) => e.id !== id,
      );
    } else if (!wasActive && isActive) {
      this.allActiveEntities.push(newEntity);
    } else if (isActive) {
      const activeIdx = this.allActiveEntities.findIndex((e) => e.id === id);
      if (activeIdx !== -1) {
        this.allActiveEntities[activeIdx] = newEntity;
      } else {
        this.allActiveEntities.push(newEntity);
      }
    }

    if (oldEntity.parent !== newEntity.parent) {
      if (oldEntity.parent && this.parentToChildren[oldEntity.parent]) {
        this.parentToChildren[oldEntity.parent] = this.parentToChildren[
          oldEntity.parent
        ].filter((cid) => cid !== id);
        if (this.parentToChildren[oldEntity.parent].length === 0) {
          delete this.parentToChildren[oldEntity.parent];
        }
      }
      if (newEntity.parent) {
        if (!this.parentToChildren[newEntity.parent]) {
          this.parentToChildren[newEntity.parent] = [];
        }
        if (!this.parentToChildren[newEntity.parent].includes(id)) {
          this.parentToChildren[newEntity.parent].push(id);
        }
      }
    }

    this.titleAndAliasIndex = this.titleAndAliasIndex.filter(
      (item) => item.entityId !== id,
    );
    let addedToTitleIndex = false;
    if (newEntity.title) {
      this.titleAndAliasIndex.push({
        lowercaseText: newEntity.title.toLowerCase(),
        entityId: newEntity.id,
        actualTitle: newEntity.title,
        isAlias: false,
        visibility: newEntity.visibility,
        labels: newEntity.labels,
        status: newEntity.status || "active",
      });
      addedToTitleIndex = true;
    }
    if (newEntity.aliases && Array.isArray(newEntity.aliases)) {
      for (let j = 0; j < newEntity.aliases.length; j++) {
        const alias = newEntity.aliases[j];
        if (alias) {
          this.titleAndAliasIndex.push({
            lowercaseText: alias.toLowerCase(),
            entityId: newEntity.id,
            actualTitle: newEntity.title,
            isAlias: true,
            visibility: newEntity.visibility,
            labels: newEntity.labels,
            status: newEntity.status || "active",
          });
          addedToTitleIndex = true;
        }
      }
    }
    if (addedToTitleIndex) {
      this.titleAndAliasIndex.sort(
        (a, b) => b.lowercaseText.length - a.lowercaseText.length,
      );
    }

    if (wasActive && oldEntity.labels) {
      const uniqueOldLabels = new Set(oldEntity.labels);
      for (const l of uniqueOldLabels) {
        if (this.labelCounts[l] !== undefined) {
          this.labelCounts[l]--;
          if (this.labelCounts[l] <= 0) {
            delete this.labelCounts[l];
          }
        }
      }
    }
    if (isActive && newEntity.labels) {
      const uniqueLabels = new Set(newEntity.labels);
      for (const l of uniqueLabels) {
        this.labelCounts[l] = (this.labelCounts[l] || 0) + 1;
      }
    }

    const oldLabelsStr = JSON.stringify(oldEntity.labels || []);
    const newLabelsStr = JSON.stringify(newEntity.labels || []);
    if (oldLabelsStr !== newLabelsStr) {
      const remainingLabels = new Set<string>();
      for (let j = 0; j < this.allEntities.length; j++) {
        const e = this.allEntities[j];
        if (e.labels) {
          for (let k = 0; k < e.labels.length; k++) {
            remainingLabels.add(e.labels[k]);
          }
        }
      }
      this.labelIndex = Array.from(remainingLabels).sort();
    }
  }

  private patchGraphEntity(entity: LocalEntity) {
    const idx = this.graphEntities.findIndex((e) => e.id === entity.id);
    if (idx !== -1) {
      const next = [...this.graphEntities];
      next[idx] = entity;
      this.graphEntities = next;
    } else {
      this.graphEntities = [...this.graphEntities, entity];
    }
    this.bumpGraphStructureVersion();
  }

  private bumpGraphStructureVersion() {
    this.graphStructureVersion++;
  }
}
