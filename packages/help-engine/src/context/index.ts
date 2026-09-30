import { z } from "zod";
import { AVAILABLE_ACTION_IDS, HELP_FLAGS } from "../actions/catalogue";

export const HELP_CONTEXT_VERSION = 1 as const;

/**
 * Route templates the app can be on, as SvelteKit route IDs. A closed list, so
 * a resolved path (which could carry an identifier) can never pass validation.
 */
export const HELP_ROUTE_TEMPLATES = [
  "/(app)",
  "/(app)/adventure",
  "/(app)/canvas",
  "/(app)/decks",
  "/(app)/dice",
  "/(app)/guest",
  "/(app)/help",
  "/(app)/help/[slug]",
  "/(app)/import",
  "/(app)/map",
  "/(app)/oracle",
  "/(app)/table",
  "/(app)/tables",
  "/(app)/templates",
  "/(app)/timeline",
  // Reserved for the public surface (the spike never produces it).
  "/(marketing)/generators/random",
  "unknown",
] as const;

export const HELP_AREAS = [
  "entity-detail",
  "graph",
  "session-hub",
  "tables",
  "generators",
  "other",
] as const;

/** Built-in category IDs only; any user-defined category is sent as `custom`. */
export const HELP_ENTITY_KINDS = [
  "character",
  "creature",
  "location",
  "item",
  "event",
  "faction",
  "note",
  "custom",
] as const;

/** Entity detail tab IDs (mirrors `entityDetailTabs` in the web app). */
export const HELP_TABS = [
  "status",
  "connections",
  "lore",
  "map",
  "chats",
  "family",
  "stats",
  "timeline",
] as const;

export const HELP_MODES = ["view", "edit", "draft"] as const;

/** The spike only produces `vault`; `public` is reserved for later. */
export const HELP_SURFACES = ["vault", "public"] as const;

export type HelpRouteTemplate = (typeof HELP_ROUTE_TEMPLATES)[number];
export type HelpArea = (typeof HELP_AREAS)[number];
export type HelpEntityKind = (typeof HELP_ENTITY_KINDS)[number];
export type HelpTab = (typeof HELP_TABS)[number];
export type HelpMode = (typeof HELP_MODES)[number];
export type HelpSurface = (typeof HELP_SURFACES)[number];

/**
 * The screen description (HelpContextV1). Strict on purpose: an unknown key is
 * rejected, so adding a field is a reviewed schema change, never an accident.
 * There is deliberately no free-text field and no identifier field.
 */
export const HelpContextSchema = z
  .object({
    v: z.literal(HELP_CONTEXT_VERSION),
    routeTemplate: z.enum(HELP_ROUTE_TEMPLATES),
    area: z.enum(HELP_AREAS),
    entityKind: z.enum(HELP_ENTITY_KINDS).nullable(),
    tab: z.enum(HELP_TABS).nullable(),
    mode: z.enum(HELP_MODES),
    surface: z.enum(HELP_SURFACES),
    flags: z.array(z.enum(HELP_FLAGS)).max(8),
    availableActions: z.array(z.enum(AVAILABLE_ACTION_IDS)).max(12),
  })
  .strict();

export type HelpContext = z.infer<typeof HelpContextSchema>;

/** The exact key set, asserted by tests so silent additions fail CI. */
export const HELP_CONTEXT_KEYS = Object.keys(HelpContextSchema.shape).sort();

export type ParsedHelpContext =
  { ok: true; value: HelpContext } | { ok: false };

/** Strict parse for the trust boundary (Worker): anything off-schema fails. */
export function parseHelpContext(input: unknown): ParsedHelpContext {
  const result = HelpContextSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : { ok: false };
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

function pick<T extends readonly string[]>(
  values: T,
  input: unknown,
): T[number] | undefined {
  return typeof input === "string" &&
    (values as readonly string[]).includes(input)
    ? (input as T[number])
    : undefined;
}

function pickMany<T extends readonly string[]>(
  values: T,
  input: unknown,
  max: number,
): T[number][] {
  if (!Array.isArray(input)) return [];
  const out: T[number][] = [];
  for (const item of input) {
    const hit = pick(values, item);
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Lenient builder for the client. It always returns a valid screen
 * description: unknown keys are dropped, an unrecognised route becomes
 * `unknown`, a user-defined category becomes `custom`, and unknown flags or
 * actions are discarded. A misbehaving provider can therefore never break help
 * or smuggle data through; it can only lose detail.
 */
export function sanitizeHelpContext(input: unknown): HelpContext {
  const raw = asRecord(input);
  const rawKind = raw.entityKind;
  const kind =
    rawKind == null
      ? null
      : (pick(HELP_ENTITY_KINDS, rawKind) ?? ("custom" as const));
  return {
    v: HELP_CONTEXT_VERSION,
    routeTemplate: pick(HELP_ROUTE_TEMPLATES, raw.routeTemplate) ?? "unknown",
    area: pick(HELP_AREAS, raw.area) ?? "other",
    entityKind: kind,
    tab: pick(HELP_TABS, raw.tab) ?? null,
    mode: pick(HELP_MODES, raw.mode) ?? "view",
    surface: pick(HELP_SURFACES, raw.surface) ?? "vault",
    flags: pickMany(HELP_FLAGS, raw.flags, 8),
    availableActions: pickMany(AVAILABLE_ACTION_IDS, raw.availableActions, 12),
  };
}

/** A general-guide screen description for when no provider has reported yet. */
export function emptyHelpContext(): HelpContext {
  return sanitizeHelpContext({});
}
