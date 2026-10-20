/**
 * Business / Enterprise Generator (#3627, spec 180) — regenerate one section
 * with an optional steer, and rename a person across the other sections.
 */

import { defaultRng, type Rng } from "./random-utils";
import { localSectionFor } from "./business-local";
import { checkBusiness, findUnintroducedNames } from "./business-checks";
import {
  establishedFacts,
  parseBusinessConnections,
  parseBusinessTrouble,
} from "./public-business";
import { readJsonObject, throwIfAborted } from "./staged-runtime";
import {
  businessSectionLabel,
  type BusinessDocument,
  type BusinessSectionId,
} from "./business-state";

export interface RegenerateBusinessSectionOptions {
  useAI: boolean;
  instruction?: string;
  send?: (message: string, signal?: AbortSignal) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
}

export interface RegenerateBusinessSectionResult {
  document: BusinessDocument;
  /** Set when a person's name changed and was replaced in the other sections. */
  renamed?: { from: string; to: string };
  warnings: string[];
}

const SECTION_SHAPES: Record<string, string> = {
  hooks: `{"hooks":["2 or 3 hooks, each naming a person, party or dependency already in this business"]}`,
  leadership: `{"name","role","goal","trait"}`,
  management: `{"management":{"strengths","liabilities","upgrades","obligations","successAttracts"}}`,
  dependencies: `{"dependencies":[{"input","kind","ifItFails"}]}`,
  relationships: `{"relationships":[{"name","kind","partyKind","reason"}]}`,
};

function sectionShape(section: BusinessSectionId): string {
  if (section.startsWith("staff:")) return SECTION_SHAPES.leadership;
  return SECTION_SHAPES[section] ?? `{"${section}": ...}`;
}

function sectionMessage(
  section: BusinessSectionId,
  doc: BusinessDocument,
  instruction: string,
): string {
  const steer = instruction.trim()
    ? `\nThe GM asks: ${instruction.trim()}`
    : "";
  return `Rewrite only the ${businessSectionLabel(section)} of ${doc.identity.name}, a ${doc.options.businessType} in ${doc.options.genre}. Keep everything else as it is, and refer only to the people and parties already established.\nEstablished facts:\n${establishedFacts(doc)}\nReturn JSON: ${sectionShape(section)}.${steer}`;
}

type Applier = (
  doc: BusinessDocument,
  data: Record<string, unknown>,
  section: BusinessSectionId,
) => BusinessDocument | null;

const TEXT_SECTIONS = [
  "pressure",
  "asset",
  "secret",
  "opportunity",
  "complication",
] as const;

/** A single trimmed string field, taken from the reply by its own name. */
const textField =
  (field: (typeof TEXT_SECTIONS)[number]): Applier =>
  (doc, data) => {
    const v = data[field];
    return typeof v === "string" && v.trim()
      ? { ...doc, [field]: v.trim() }
      : null;
  };

const applyHooks: Applier = (doc, data) => {
  const hooks = Array.isArray(data.hooks)
    ? data.hooks.filter(
        (h): h is string => typeof h === "string" && h.trim() !== "",
      )
    : [];
  return hooks.length >= 2 && hooks.length <= 3
    ? { ...doc, hooks: hooks.map((h) => h.trim()) }
    : null;
};

const applyManagement: Applier = (doc, data) => {
  const parsed = parseBusinessTrouble(
    JSON.stringify({
      pressure: doc.pressure,
      asset: doc.asset,
      secret: doc.secret,
      opportunity: doc.opportunity,
      complication: doc.complication,
      hooks: doc.hooks,
      management: data.management,
    }),
    true,
  );
  return parsed?.management ? { ...doc, management: parsed.management } : null;
};

const applyConnections: Applier = (doc, data, section) => {
  const parsed = parseBusinessConnections(
    JSON.stringify({
      dependencies:
        section === "dependencies" ? data.dependencies : doc.dependencies,
      relationships:
        section === "relationships" ? data.relationships : doc.relationships,
      reputation: doc.reputation,
    }),
  );
  if (!parsed) return null;
  return section === "dependencies"
    ? { ...doc, dependencies: parsed.dependencies }
    : { ...doc, relationships: parsed.relationships };
};

/** Name, goal and trait are required; the style is kept when the reply has none. */
function readPerson(
  data: Record<string, unknown>,
): { name: string; goal: string; trait: string; style?: string } | null {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const trait = typeof data.trait === "string" ? data.trait.trim() : "";
  if (!name || !trait) return null;
  const goal =
    typeof data.goal === "string" && data.goal.trim()
      ? data.goal.trim()
      : "Keep the place running.";
  return {
    name,
    goal,
    trait,
    style: typeof data.style === "string" ? data.style : undefined,
  };
}

const applyLeadership: Applier = (doc, data) => {
  const person = readPerson(data);
  if (!person) return null;
  return {
    ...doc,
    leadership: {
      ...doc.leadership,
      name: person.name,
      goal: person.goal,
      trait: person.trait,
      style: person.style ?? doc.leadership.style,
    },
  };
};

const applyStaff =
  (id: string): Applier =>
  (doc, data) => {
    const person = readPerson(data);
    if (!person) return null;
    return {
      ...doc,
      staff: doc.staff.map((p) =>
        p.id === id
          ? { ...p, name: person.name, goal: person.goal, trait: person.trait }
          : p,
      ),
    };
  };

/** Identity, operations, clientele and reputation: merge each non-empty string into the section. */
const applySubsection: Applier = (doc, data, section) => {
  const sub = data[section];
  if (!sub || typeof sub !== "object") return null;
  const current = doc[
    section as "identity" | "operations" | "clientele" | "reputation"
  ] as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...current };
  for (const key of Object.keys(current)) {
    const v = (sub as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) merged[key] = v.trim();
  }
  return { ...doc, [section]: merged } as BusinessDocument;
};

const APPLIERS: Record<string, Applier> = {
  ...Object.fromEntries(TEXT_SECTIONS.map((f) => [f, textField(f)])),
  hooks: applyHooks,
  management: applyManagement,
  dependencies: applyConnections,
  relationships: applyConnections,
  leadership: applyLeadership,
  identity: applySubsection,
  operations: applySubsection,
  clientele: applySubsection,
  reputation: applySubsection,
};

/** Applies an AI reply to one section, or returns null when it does not fit. */
function applyReply(
  doc: BusinessDocument,
  section: BusinessSectionId,
  reply: string,
): BusinessDocument | null {
  const data = readJsonObject(reply);
  if (!data) return null;
  if (section.startsWith("staff:"))
    return applyStaff(section.slice("staff:".length))(doc, data, section);
  const applier = APPLIERS[section];
  return applier ? applier(doc, data, section) : null;
}

function nameOf(
  doc: BusinessDocument,
  section: BusinessSectionId,
): string | undefined {
  if (section === "leadership") return doc.leadership.name;
  if (section.startsWith("staff:"))
    return doc.staff.find((p) => `staff:${p.id}` === section)?.name;
  return undefined;
}

/**
 * Whole-word replacement of `from` with `to` across the document. The GM's
 * campaign context is never changed.
 */
export function propagateRename(
  doc: BusinessDocument,
  from: string,
  to: string,
  except: BusinessSectionId,
): BusinessDocument {
  void except;
  if (!from || from === to) return doc;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`,
    "gu",
  );
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") return value.replace(pattern, to);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          k === "options" ? v : walk(v),
        ]),
      );
    }
    return value;
  };
  return walk(doc) as BusinessDocument;
}

/**
 * Regenerates one section, with an optional steer. Other sections are kept.
 * With AI off, or when the AI reply does not fit, the section is rebuilt from
 * the tables and a warning is returned. Cancellation always propagates.
 */
export async function regenerateBusinessSection(
  doc: BusinessDocument,
  section: BusinessSectionId,
  options: RegenerateBusinessSectionOptions,
): Promise<RegenerateBusinessSectionResult> {
  const rng = options.rng ?? defaultRng;
  const warnings: string[] = [];
  let next: BusinessDocument | null = null;

  if (options.useAI && options.send) {
    throwIfAborted(options.signal);
    const reply = await options.send(
      sectionMessage(section, doc, options.instruction ?? ""),
      options.signal,
    );
    throwIfAborted(options.signal);
    const applied = applyReply(doc, section, reply);
    const issues = applied
      ? checkBusiness(applied).filter(
          (i) =>
            i.section === section ||
            (section === "hooks" && i.code === "hook-unanchored"),
        )
      : [];
    if (applied && issues.length === 0) {
      next = applied;
    } else {
      warnings.push(
        `The AI reply for the ${businessSectionLabel(section)} was not usable, so it was rewritten from the tables.`,
      );
    }
  }

  if (!next) next = localSectionFor(doc, section, rng);

  const before = nameOf(doc, section);
  const after = nameOf(next, section);
  let renamed: RegenerateBusinessSectionResult["renamed"];
  if (before && after && before !== after) {
    next = propagateRename(next, before, after, section);
    renamed = { from: before, to: after };
  }
  // The unintroduced-names notice describes the document as it now stands.
  const unintroduced = findUnintroducedNames(next);
  next = { ...next, warnings: unintroduced.length ? unintroduced : undefined };
  return { document: next, renamed, warnings };
}
