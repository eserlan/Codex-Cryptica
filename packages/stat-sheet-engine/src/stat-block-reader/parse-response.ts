import { extractJsonObject } from "@codex/runtime";
import { detectStatBlockSystem } from "../stat-block/detect";
import { deriveProficiencyBonus } from "./derive";
import { runLocalChecks } from "./local-checks";
import {
  CandidateSchema,
  CreatureValuesSchema,
  FieldNoteSchema,
  LeftoverSchema,
  NpcValuesSchema,
} from "./read-result-schema";
import { StatBlockReadError } from "./errors";
import type {
  Candidate,
  FieldNote,
  ImportRequest,
  Leftover,
  LooksLike,
  ReadOutcome,
  ReadResult,
  SheetKind,
} from "./types";

type Plain = Record<string, unknown>;

const OUTCOMES: ReadOutcome[] = ["ok", "no-stat-block", "several", "character"];
const LOOKS_LIKE: LooksLike[] = ["tov", "5e", "unknown"];

function isPlainObject(value: unknown): value is Plain {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function removeAt(root: unknown, path: PropertyKey[]): void {
  if (path.length === 0) return;
  let parent = root as Plain | unknown[];
  for (const key of path.slice(0, -1)) {
    parent = (parent as Record<PropertyKey, unknown>)[key] as Plain | unknown[];
    if (parent === null || typeof parent !== "object") return;
  }
  const last = path[path.length - 1]!;
  if (Array.isArray(parent) && typeof last === "number") {
    parent.splice(last, 1);
  } else {
    delete (parent as Record<PropertyKey, unknown>)[last];
  }
}

function pathString(path: PropertyKey[]): string {
  return path.map(String).join(".");
}

/**
 * Validates values without defaults. A value that fails is removed and marked
 * malformed, so one bad field never blocks the rest of the read.
 */
function parseValues(
  kind: SheetKind,
  raw: unknown,
  notes: FieldNote[],
): ReadResult["values"] {
  if (!isPlainObject(raw)) return {};
  const schema = kind === "npc" ? NpcValuesSchema : CreatureValuesSchema;
  const working = clone(raw);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const parsed = schema.safeParse(working);
    if (parsed.success) return parsed.data as ReadResult["values"];
    for (const issue of parsed.error.issues) {
      removeAt(working, issue.path as PropertyKey[]);
      const path = pathString(issue.path as PropertyKey[]);
      if (!notes.some((n) => n.path === path)) {
        notes.push({ path, state: "check", reason: "malformed" });
      }
    }
  }
  return {};
}

function knownKeys(kind: SheetKind): Set<string> {
  const shape =
    kind === "npc" ? NpcValuesSchema.shape : CreatureValuesSchema.shape;
  return new Set(Object.keys(shape));
}

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Keys the sheet has no field for, with content, go to the leftovers list. */
function unknownKeyLeftovers(kind: SheetKind, raw: unknown) {
  if (!isPlainObject(raw)) return [];
  const known = knownKeys(kind);
  return Object.entries(raw).flatMap(([key, value]) => {
    if (known.has(key) || value === null || value === undefined) return [];
    if (typeof value === "string" && value.trim() === "") return [];
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return [{ label: humanize(key), text }];
  });
}

function parseNotes(raw: unknown): FieldNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = FieldNoteSchema.safeParse(item);
    return parsed.success
      ? [
          {
            path: parsed.data.path,
            state: parsed.data.state,
            reason: parsed.data.reason,
            ...(parsed.data.source ? { source: parsed.data.source } : {}),
            ...(parsed.data.original !== undefined
              ? { original: parsed.data.original }
              : {}),
          } satisfies FieldNote,
        ]
      : [];
  });
}

/**
 * Turns the model's JSON reply into a ReadResult: validates it without
 * defaults, derives proficiency from CR, and runs the local checks. Throws
 * StatBlockReadError when there is no JSON object to read.
 */
export function parseStatBlockReadResponse(
  text: string,
  request: ImportRequest,
): ReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch {
    throw new StatBlockReadError("malformed");
  }
  if (!isPlainObject(parsed)) throw new StatBlockReadError("malformed");

  const outcome = OUTCOMES.find((o) => o === parsed.outcome);
  if (!outcome) throw new StatBlockReadError("malformed");
  const kind: SheetKind =
    parsed.kind === "npc" || parsed.kind === "creature"
      ? parsed.kind
      : (request.kindHint ?? "creature");
  // The model's view wins. The text detector only fills in when the model is unsure.
  const modelLooksLike =
    LOOKS_LIKE.find((l) => l === parsed.looksLike) ?? "unknown";
  const detected: LooksLike =
    detectStatBlockSystem(request.source) === "dnd5e" ? "5e" : "unknown";
  const looksLike: LooksLike =
    modelLooksLike !== "unknown" ? modelLooksLike : detected;

  const notes: FieldNote[] = parseNotes(parsed.notes);
  const values =
    outcome === "ok" ? parseValues(kind, parsed.values, notes) : {};
  const leftovers: Leftover[] = [
    ...(Array.isArray(parsed.leftovers) ? parsed.leftovers : []).flatMap(
      (item): Leftover[] => {
        const result = LeftoverSchema.safeParse(item);
        return result.success ? [result.data] : [];
      },
    ),
    ...(outcome === "ok" ? unknownKeyLeftovers(kind, parsed.values) : []),
  ];
  const candidates: Candidate[] = (
    Array.isArray(parsed.candidates) ? parsed.candidates : []
  ).flatMap((item): Candidate[] => {
    const result = CandidateSchema.safeParse(item);
    return result.success
      ? [{ name: result.data.name, index: result.data.index }]
      : [];
  });

  const base: ReadResult = {
    outcome,
    candidates,
    looksLike,
    kind,
    name: typeof parsed.name === "string" ? parsed.name : null,
    values,
    notes,
    leftovers,
    reader: "ai",
    corrected: [],
  };

  const derived = deriveProficiencyBonus(base);
  return runLocalChecks(derived, {
    mode: request.mode,
    source: request.source,
  });
}
