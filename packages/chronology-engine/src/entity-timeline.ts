import type { Entity } from "schema";
import type {
  WorldCalendar,
  EntityTimeline,
  EntityTimelineRow,
  EntityTimelineGroup,
} from "./types";
import { calendarEngine } from "./engine";

export function buildEntityTimeline(
  subject: Entity,
  allEntities: Entity[],
  config: WorldCalendar,
  options?: { maxParticipants?: number; summaryMaxLength?: number },
): EntityTimeline {
  const maxParticipants = options?.maxParticipants ?? 5;
  const summaryMaxLength = options?.summaryMaxLength ?? 160;

  // Step 1: collect event ids directly linked to subject (outgoing + incoming), de-duped
  const outgoingIds = new Set(subject.connections.map((c) => c.target));
  const eventIdSet = new Set<string>();

  for (const entity of allEntities) {
    if (entity.type !== "event") continue;
    // outgoing from subject
    if (outgoingIds.has(entity.id)) {
      eventIdSet.add(entity.id);
    }
    // incoming: event has connection pointing to subject
    if (entity.connections.some((c) => c.target === subject.id)) {
      eventIdSet.add(entity.id);
    }
  }

  // Build entity lookup
  const entityById = new Map<string, Entity>();
  for (const e of allEntities) {
    entityById.set(e.id, e);
  }

  // Step 2: build rows
  const rows: EntityTimelineRow[] = [];
  for (const eventId of eventIdSet) {
    const event = entityById.get(eventId);
    if (!event) continue;

    const primaryDate =
      event.start_date ?? event.date ?? event.end_date ?? undefined;
    const isRange = !!(event.start_date && event.end_date);

    let dateKind: "exact" | "approximate" | "missing";
    let sortKey: number | undefined;
    let displayDateLabel: string;

    if (!primaryDate || !calendarEngine.isValid(primaryDate, config)) {
      dateKind = "missing";
      sortKey = undefined;
      displayDateLabel = "Undated";
    } else {
      dateKind = "exact";
      sortKey = calendarEngine.getTimelineValue(primaryDate, config);
      displayDateLabel = calendarEngine.format(primaryDate, config);
    }

    const eventCategory = event.labels?.[0] ?? undefined;

    const trimmed = event.content?.trim() ?? "";
    const summary = trimmed
      ? [...trimmed].slice(0, summaryMaxLength).join("")
      : undefined;

    const participantIds = new Set<string>();
    for (const c of event.connections) participantIds.add(c.target);
    for (const e of allEntities) {
      if (e.connections.some((c) => c.target === event.id))
        participantIds.add(e.id);
    }
    const participantTitles = [...participantIds]
      .filter((id) => id !== subject.id)
      .map((id) => entityById.get(id))
      .filter((e): e is Entity => e !== undefined)
      .map((e) => e.title)
      .slice(0, maxParticipants);

    rows.push({
      eventId: event.id,
      title: event.title,
      dateKind,
      displayDateLabel,
      isRange,
      sortKey,
      eventCategory,
      summary,
      participantTitles,
    });
  }

  // Step 3: split dated / undated
  const datedRows = rows.filter((r) => r.sortKey !== undefined);
  const undatedRows = rows.filter((r) => r.sortKey === undefined);

  // Step 4: sort
  datedRows.sort((a, b) => {
    const diff = (a.sortKey as number) - (b.sortKey as number);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });

  undatedRows.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  // Step 5: build groups
  const groups: EntityTimelineGroup[] = [];
  if (datedRows.length > 0) {
    groups.push({ kind: "dated", label: "Timeline", rows: datedRows });
  }
  if (undatedRows.length > 0) {
    groups.push({ kind: "undated", label: "Undated", rows: undatedRows });
  }

  return { groups, isEmpty: groups.length === 0 };
}
