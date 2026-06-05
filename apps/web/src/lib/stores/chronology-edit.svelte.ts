import {
  buildIntent,
  detectConflict,
  getBeginMeaning,
  removeAnchor,
  validateRange,
  type PlacementIntent,
  type TemporalMeaning,
} from "chronology-engine";
import { getYearForPosition, type YearPositionContext } from "graph-engine";
import type { Entity, TemporalMetadata } from "schema";
import { vault as defaultVault } from "./vault.svelte";

export type ChronologyGestureKind = "point" | "span";

export interface ChronologyDrag {
  source: "graph" | "explorer";
  entityId: string;
  anchorId?: string;
  originPosition?: { x: number; y: number };
  pressYear: number;
  targetYear: number;
  gestureKind: ChronologyGestureKind;
}

export interface ChronologyEditDependencies {
  vault?: Pick<
    typeof defaultVault,
    "entities" | "updateEntity" | "createEntity" | "deleteEntity"
  > & {
    addConnection?: (
      source: string,
      target: string,
      type: string,
    ) => Promise<unknown>;
  };
  resolveYear?: (
    position: number | { x: number; y: number },
    context: YearPositionContext,
  ) => number | null;
  now?: () => number;
}

export class ChronologyEditService {
  drag = $state<ChronologyDrag | null>(null);
  pendingIntent = $state<PlacementIntent | null>(null);
  pendingEntity = $state<Entity | null>(null);
  conflict = $state(false);
  error = $state<string | null>(null);

  private baseline: Entity | null = null;
  private deps: Required<
    Pick<ChronologyEditDependencies, "resolveYear" | "now">
  > &
    Omit<ChronologyEditDependencies, "resolveYear" | "now">;

  constructor(deps: ChronologyEditDependencies = {}) {
    this.deps = {
      vault: deps.vault ?? defaultVault,
      resolveYear: deps.resolveYear ?? getYearForPosition,
      now: deps.now ?? Date.now,
    };
  }

  beginDrag(args: {
    entity: Entity;
    source?: "graph" | "explorer";
    anchorId?: string;
    originPosition?: { x: number; y: number };
    pressPosition: number | { x: number; y: number };
    context: YearPositionContext;
  }): boolean {
    const year = this.deps.resolveYear(args.pressPosition, args.context);
    if (year === null) return false;

    this.baseline = structuredClone($state.snapshot(args.entity));
    this.pendingEntity = args.entity;
    this.pendingIntent = null;
    this.conflict = false;
    this.error = null;
    this.drag = {
      source: args.source ?? "graph",
      entityId: args.entity.id,
      anchorId: args.anchorId,
      originPosition: args.originPosition,
      pressYear: year,
      targetYear: year,
      gestureKind: "point",
    };
    return true;
  }

  updateDrag(
    position: number | { x: number; y: number },
    context: YearPositionContext,
    pixelDelta = 0,
  ): boolean {
    if (!this.drag) return false;
    const year = this.deps.resolveYear(position, context);
    if (year === null) return false;

    this.drag.targetYear = year;
    this.drag.gestureKind =
      Math.abs(year - this.drag.pressYear) >= 1 && Math.abs(pixelDelta) >= 6
        ? "span"
        : "point";
    return true;
  }

  prepareDrop(
    entity: Entity = this.pendingEntity as Entity,
  ): PlacementIntent | null {
    if (!this.drag || !entity) return null;
    if (this.drag.anchorId === "primary-range-start") {
      const start_date = this.toDate(this.drag.targetYear);
      const range = validateRange(start_date, entity.end_date);
      if (!range.valid) {
        this.error = range.reason;
        return null;
      }
      this.pendingIntent = buildIntent(entity, {
        meaning: {
          id: "rangeStart",
          label: "Range start",
          kind: "point",
          target: "start_date",
        },
        start_date,
      });
      return this.pendingIntent;
    }
    if (this.drag.anchorId === "primary-range-end") {
      const end_date = this.toDate(this.drag.targetYear);
      const range = validateRange(entity.start_date, end_date);
      if (!range.valid) {
        this.error = range.reason;
        return null;
      }
      this.pendingIntent = buildIntent(entity, {
        meaning: {
          id: "rangeEnd",
          label: "Range end",
          kind: "point",
          target: "end_date",
        },
        end_date,
      });
      return this.pendingIntent;
    }
    if (!this.drag.anchorId && entity.start_date && entity.end_date) {
      const delta = this.drag.targetYear - this.drag.pressYear;
      const start_date = this.toDate(entity.start_date.year + delta);
      const end_date = this.toDate(entity.end_date.year + delta);
      const range = validateRange(start_date, end_date);
      if (!range.valid) {
        this.error = range.reason;
        return null;
      }
      this.pendingIntent = buildIntent(entity, {
        meaning: {
          id: "rangeMove",
          label: "Range",
          kind: "span",
          target: "start_date",
        },
        start_date,
        end_date,
      });
      return this.pendingIntent;
    }
    const meaning = getBeginMeaning(entity.type);
    const date = this.toDate(this.drag.targetYear);
    const selection =
      this.drag.gestureKind === "span"
        ? {
            meaning: {
              ...meaning,
              kind: "span" as const,
              target: "start_date" as const,
            },
            start_date: this.toDate(this.drag.pressYear),
            end_date: date,
          }
        : { meaning, date };

    if ("start_date" in selection) {
      const range = validateRange(selection.start_date, selection.end_date);
      if (!range.valid) {
        this.error = range.reason;
        return null;
      }
    }

    this.pendingIntent = buildIntent(entity, selection);
    return this.pendingIntent;
  }

  buildSemanticIntent(args: {
    entity: Entity;
    meaning: TemporalMeaning;
    date?: TemporalMetadata;
    start_date?: TemporalMetadata;
    end_date?: TemporalMetadata;
    customLabel?: string;
    existingAnchorId?: string;
    createNewAnchor?: boolean;
    createEvent?: boolean;
    eventTitle?: string;
  }): PlacementIntent | null {
    const range = validateRange(args.start_date, args.end_date);
    if (!range.valid) {
      this.error = range.reason;
      return null;
    }

    this.pendingEntity = args.entity;
    this.pendingIntent = buildIntent(args.entity, args);
    return this.pendingIntent;
  }

  async confirm(
    entity: Entity = this.pendingEntity as Entity,
  ): Promise<boolean> {
    if (!this.pendingIntent || !entity || !this.baseline) return false;
    const current = this.deps.vault?.entities?.[entity.id] as
      | Entity
      | undefined;
    if (current && detectConflict(this.baseline, current)) {
      this.conflict = true;
      return false;
    }

    try {
      if (this.pendingIntent.createEvent) {
        let createdId: string | null = null;
        const originalAnchors = entity.temporalAnchors ?? [];
        let updatedSourceEntity = false;
        try {
          createdId = await this.deps.vault!.createEntity(
            "event",
            this.pendingIntent.createEvent.title,
            { date: this.pendingIntent.createEvent.date },
          );
          await this.deps.vault!.updateEntity(entity.id, {
            temporalAnchors: [
              ...originalAnchors,
              {
                id: `linked-event-${this.deps.now().toString(36)}`,
                type: this.pendingIntent.createEvent.anchorType,
                date: this.pendingIntent.createEvent.date,
                linkedEntityId: createdId,
              },
            ],
          });
          updatedSourceEntity = true;
          await this.deps.vault?.addConnection?.(
            entity.id,
            createdId,
            this.pendingIntent.createEvent.connectionType,
          );
        } catch (error) {
          if (updatedSourceEntity) {
            await this.deps.vault!.updateEntity(entity.id, {
              temporalAnchors: originalAnchors,
            });
          }
          if (createdId) {
            await this.deps.vault?.deleteEntity?.(createdId);
          }
          throw error;
        }
      } else {
        await this.deps.vault!.updateEntity(
          entity.id,
          this.pendingIntent.writes,
        );
      }
      this.clear();
      return true;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Could not save chronology edit.";
      return false;
    }
  }

  async removeAnchor(entity: Entity, anchorId: string): Promise<boolean> {
    this.baseline ??= structuredClone($state.snapshot(entity));
    const current = this.deps.vault?.entities?.[entity.id] as
      | Entity
      | undefined;
    if (current && detectConflict(this.baseline, current)) {
      this.conflict = true;
      return false;
    }

    try {
      await this.deps.vault!.updateEntity(entity.id, {
        temporalAnchors: removeAnchor(entity.temporalAnchors ?? [], anchorId),
      });
      this.clear();
      return true;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : "Could not remove chronology anchor.";
      return false;
    }
  }

  cancel() {
    this.clear();
  }

  private clear() {
    this.drag = null;
    this.pendingIntent = null;
    this.pendingEntity = null;
    this.baseline = null;
    this.conflict = false;
    this.error = null;
  }

  private toDate(year: number): TemporalMetadata {
    return { year };
  }
}

export const chronologyEdit = new ChronologyEditService();
