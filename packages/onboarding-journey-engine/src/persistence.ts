import { z } from "zod";
import type { JourneyDefinition, JourneyProgress } from "./types";

const ProgressRecord = z.object({
  schema: z.literal(1),
  journeyId: z.string(),
  journeyVersion: z.number().int().positive(),
  startedAt: z.number().finite(),
  completed: z.array(z.string()),
  skipped: z.array(z.string()),
  viewing: z.string().nullable(),
  outcome: z.enum(["running", "exited", "finished"]),
});

/**
 * Validates a stored record against the current definition and migrates it:
 * unknown step ids are dropped, a dangling `viewing` is cleared, and the
 * version moves to the definition's. Never throws; anything unusable is null.
 */
export function parseProgress(
  raw: unknown,
  def: JourneyDefinition,
): JourneyProgress | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = ProgressRecord.safeParse(value);
  if (!parsed.success || parsed.data.journeyId !== def.id) return null;
  const r = parsed.data;
  const known = new Set(def.steps.map((s) => s.id));
  const completed = [...new Set(r.completed.filter((id) => known.has(id)))];
  const skipped = [
    ...new Set(
      r.skipped.filter((id) => known.has(id) && !completed.includes(id)),
    ),
  ];
  const left = def.steps.some(
    (s) => !completed.includes(s.id) && !skipped.includes(s.id),
  );
  const outcome = r.outcome === "running" && !left ? "finished" : r.outcome;
  return {
    schema: 1,
    journeyId: def.id,
    journeyVersion: def.version,
    startedAt: r.startedAt,
    completed,
    skipped,
    viewing:
      outcome === "running" && r.viewing !== null && known.has(r.viewing)
        ? r.viewing
        : null,
    outcome,
  };
}

/** Only the record's own fields, so nothing else can ever be stored. */
export function serializeProgress(p: JourneyProgress): string {
  const {
    schema,
    journeyId,
    journeyVersion,
    startedAt,
    completed,
    skipped,
    viewing,
    outcome,
  } = p;
  return JSON.stringify({
    schema,
    journeyId,
    journeyVersion,
    startedAt,
    completed,
    skipped,
    viewing,
    outcome,
  });
}
