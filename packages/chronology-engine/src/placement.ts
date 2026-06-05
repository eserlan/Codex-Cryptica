import type { TemporalMetadata } from "./types";
import type { TemporalAnchor, TemporalEntity } from "./anchors";
import { upsertAnchor } from "./anchors";
import type { TemporalMeaning } from "./meaning-sets";

export interface PlacementSelection {
  meaning: TemporalMeaning;
  date?: TemporalMetadata;
  start_date?: TemporalMetadata;
  end_date?: TemporalMetadata;
  customLabel?: string;
  existingAnchorId?: string;
  createNewAnchor?: boolean;
  createEvent?: boolean;
  eventTitle?: string;
}

export interface PlacementIntent {
  summary: string;
  writes: Partial<TemporalEntity>;
  anchor?: TemporalAnchor;
  target: "primary" | "anchor" | "event";
  createEvent?: {
    title: string;
    date: TemporalMetadata;
    anchorType: string;
    connectionType: "related_to";
  };
}

function anchorId(type: string): string {
  return `${type}-${Date.now().toString(36)}`;
}

export function buildIntent(
  entity: TemporalEntity,
  selection: PlacementSelection,
): PlacementIntent {
  const { meaning } = selection;
  const date = selection.date ?? selection.start_date;

  if (selection.createEvent) {
    if (!date) throw new Error("A linked event requires a date.");
    return {
      summary: `Create an event for ${date.year}.`,
      writes: {},
      target: "event",
      createEvent: {
        title:
          selection.eventTitle || `${entity.title ?? entity.id} - ${date.year}`,
        date,
        anchorType: meaning.anchorType ?? meaning.id,
        connectionType: "related_to",
      },
    };
  }

  if (meaning.target === "date") {
    if (!date) throw new Error("A date placement requires a date.");
    return {
      summary: `Set date to ${date.label ?? date.year}.`,
      writes: { date },
      target: "primary",
    };
  }

  if (meaning.target === "start_date" || meaning.target === "end_date") {
    return {
      summary: "Update date range.",
      writes: {
        ...(selection.start_date ? { start_date: selection.start_date } : {}),
        ...(selection.end_date ? { end_date: selection.end_date } : {}),
      },
      target: "primary",
    };
  }

  const anchor: TemporalAnchor = {
    id:
      !selection.createNewAnchor && selection.existingAnchorId
        ? selection.existingAnchorId
        : anchorId(meaning.anchorType ?? meaning.id),
    type: meaning.anchorType ?? meaning.id,
    label: meaning.id === "custom" ? selection.customLabel : undefined,
    ...(selection.date ? { date: selection.date } : {}),
    ...(selection.start_date ? { start_date: selection.start_date } : {}),
    ...(selection.end_date ? { end_date: selection.end_date } : {}),
  };

  return {
    summary: `Save ${meaning.label.toLowerCase()}.`,
    writes: {
      temporalAnchors: upsertAnchor(entity.temporalAnchors, anchor),
    },
    anchor,
    target: "anchor",
  };
}

export function detectConflict(
  baseline: TemporalEntity,
  current: TemporalEntity,
): boolean {
  return (
    JSON.stringify({
      date: baseline.date,
      start_date: baseline.start_date,
      end_date: baseline.end_date,
      temporalAnchors: baseline.temporalAnchors,
    }) !==
    JSON.stringify({
      date: current.date,
      start_date: current.start_date,
      end_date: current.end_date,
      temporalAnchors: current.temporalAnchors,
    })
  );
}
