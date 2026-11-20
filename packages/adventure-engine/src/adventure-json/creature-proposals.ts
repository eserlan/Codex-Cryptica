import type {
  AdventureJsonActor,
  AdventureJsonEncounter,
  AdventureJsonV1,
  SourceReference,
  Visibility,
} from "./schema";

export interface CreatureProposalEncounter {
  id: string;
  title: string;
  pages: number[];
  sourceRef?: SourceReference;
  visibility: Visibility;
}

export interface CreatureProposal {
  key: string;
  name: string;
  actorIds: string[];
  pages: number[];
  sourceRefs: SourceReference[];
  summary: string[];
  description: string[];
  role: string[];
  motivation: string[];
  disposition: string[];
  aliases: string[];
  labels: string[];
  encounters: CreatureProposalEncounter[];
  concealed: boolean;
}

export interface CreatureEntryText {
  content: string;
  lore?: string;
}

export const UNTITLED_ENCOUNTER = "Untitled encounter";

type TextField =
  "summary" | "description" | "role" | "motivation" | "disposition";
const TEXT_FIELDS: TextField[] = [
  "summary",
  "description",
  "role",
  "motivation",
  "disposition",
];

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function pagesOf(ref: SourceReference | undefined): number[] {
  if (!ref) return [];
  return [ref.page, ref.pageEnd].filter(
    (page): page is number => typeof page === "number",
  );
}

function sortedUnique(pages: number[]): number[] {
  return [...new Set(pages)].sort((a, b) => a - b);
}

function pushDistinct(
  list: string[],
  seen: Set<string>,
  value: string | undefined,
): void {
  if (!value || !value.trim() || seen.has(value)) return;
  seen.add(value);
  list.push(value);
}

interface ProposalAccumulator {
  proposal: CreatureProposal;
  sourceRefKeys: Set<string>;
  encounterIds: Set<string>;
  textValues: Map<TextField, Set<string>>;
  aliases: Set<string>;
  labels: Set<string>;
}

function toProposalEncounter(
  encounter: AdventureJsonEncounter,
): CreatureProposalEncounter {
  return {
    id: encounter.id,
    title: encounter.title ?? UNTITLED_ENCOUNTER,
    pages: sortedUnique(pagesOf(encounter.sourceRef)),
    ...(encounter.sourceRef ? { sourceRef: encounter.sourceRef } : {}),
    visibility: encounter.visibility,
  };
}

/**
 * Proposes one Creature per distinct actor name. Actors with `kind: "creature"`
 * are always proposed, `kind: "character"` never, and actors without a `kind`
 * only when an encounter references them.
 */
export function buildCreatureProposals(
  pkg: AdventureJsonV1,
): CreatureProposal[] {
  const encountersByActor = new Map<string, AdventureJsonEncounter[]>();
  for (const encounter of pkg.encounters) {
    for (const actorId of new Set(encounter.actorIds ?? [])) {
      const list = encountersByActor.get(actorId) ?? [];
      list.push(encounter);
      encountersByActor.set(actorId, list);
    }
  }

  const proposals = new Map<string, ProposalAccumulator>();
  for (const actor of pkg.actors) {
    if (actor.kind === "character") continue;
    const linked = encountersByActor.get(actor.id) ?? [];
    if (actor.kind !== "creature" && linked.length === 0) continue;
    const key = normalizeName(actor.name);
    let accumulator = proposals.get(key);
    if (!accumulator) {
      accumulator = {
        proposal: {
          key,
          name: actor.name,
          actorIds: [],
          pages: [],
          sourceRefs: [],
          summary: [],
          description: [],
          role: [],
          motivation: [],
          disposition: [],
          aliases: [],
          labels: [],
          encounters: [],
          concealed: false,
        },
        sourceRefKeys: new Set(),
        encounterIds: new Set(),
        textValues: new Map(TEXT_FIELDS.map((field) => [field, new Set()])),
        aliases: new Set(),
        labels: new Set(),
      };
      proposals.set(key, accumulator);
    }
    mergeActor(accumulator, actor, linked);
  }

  const ordered = [...proposals.values()].map(({ proposal }) => proposal);
  const encounterOrder = new Map(
    pkg.encounters.map((encounter, index) => [encounter.id, index]),
  );
  for (const proposal of ordered) {
    proposal.pages = sortedUnique(proposal.pages);
    proposal.encounters.sort(
      (a, b) => encounterOrder.get(a.id)! - encounterOrder.get(b.id)!,
    );
  }
  return ordered;
}

function addProposalSourceRef(
  accumulator: ProposalAccumulator,
  ref: SourceReference | undefined,
): void {
  if (!ref) return;
  const key = `${ref.page ?? ""}:${ref.pageEnd ?? ""}`;
  if (accumulator.sourceRefKeys.has(key)) return;
  accumulator.sourceRefKeys.add(key);
  accumulator.proposal.sourceRefs.push(ref);
}

function addProposalEncounters(
  accumulator: ProposalAccumulator,
  linked: AdventureJsonEncounter[],
): void {
  for (const encounter of linked) {
    if (!accumulator.encounterIds.has(encounter.id)) {
      accumulator.encounterIds.add(encounter.id);
      accumulator.proposal.encounters.push(toProposalEncounter(encounter));
    }
    if (encounter.visibility === "gm-only")
      accumulator.proposal.concealed = true;
  }
}

function mergeActor(
  accumulator: ProposalAccumulator,
  actor: AdventureJsonActor,
  linked: AdventureJsonEncounter[],
): void {
  const { proposal, textValues } = accumulator;
  proposal.actorIds.push(actor.id);
  proposal.pages.push(...pagesOf(actor.sourceRef));
  addProposalSourceRef(accumulator, actor.sourceRef);
  for (const field of TEXT_FIELDS)
    pushDistinct(proposal[field], textValues.get(field)!, actor[field]);
  for (const alias of actor.aliases ?? [])
    pushDistinct(proposal.aliases, accumulator.aliases, alias);
  for (const label of actor.labels ?? [])
    pushDistinct(proposal.labels, accumulator.labels, label);
  if (actor.visibility === "gm-only") proposal.concealed = true;
  addProposalEncounters(accumulator, linked);
}

/**
 * Escapes Markdown and HTML control characters so package or user text stays
 * literal text in an entry: no image, link, tag or heading can be built from it.
 */
export function escapeEntryText(text: string): string {
  return text
    .replace(/[\\`*_[\]()!<>&|~]/g, "\\$&")
    .replace(/(https?):\/\//gi, "$1\\://")
    .replace(/\b(www)\./gi, "$1\\.")
    .replace(/^(\s*)([#+-])/gm, "$1\\$2")
    .replace(/^(\s*)(\d+)\./gm, "$1$2\\.");
}

/** Sorted page citations shared by the creature entry and its import review. */
export function sourcePageLabels(refs: readonly SourceReference[]): string[] {
  const cited = refs
    .filter((ref) => typeof ref.page === "number")
    .map((ref) => ({ start: ref.page!, end: ref.pageEnd ?? ref.page! }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const unique = cited.filter(
    (ref, index) =>
      index === 0 ||
      ref.start !== cited[index - 1]!.start ||
      ref.end !== cited[index - 1]!.end,
  );
  return unique.map(({ start, end }) =>
    start === end ? String(start) : `${start}–${end}`,
  );
}

function formatPageReferences(refs: SourceReference[]): string {
  const labels = sourcePageLabels(refs);
  if (labels.length === 0) return "";
  return labels.length === 1 && !labels[0]!.includes("–")
    ? `p. ${labels[0]}`
    : `pp. ${labels.join(", ")}`;
}

function encounterLine(encounter: CreatureProposalEncounter): string {
  const pages = formatPageReferences(
    encounter.sourceRef ? [encounter.sourceRef] : [],
  );
  return pages
    ? `- ${escapeEntryText(encounter.title)} (${pages})`
    : `- ${escapeEntryText(encounter.title)}`;
}

function sourceLine(
  source: AdventureJsonV1["source"],
  artCredit: string | undefined,
): string {
  const parts = [`Source: ${escapeEntryText(source.title)}`];
  if (source.authors?.length)
    parts.push(`by ${escapeEntryText(source.authors.join(", "))}`);
  if (source.license) parts.push(`Licence: ${escapeEntryText(source.license)}`);
  const credit = artCredit?.trim();
  if (credit) parts.push(`Art: ${escapeEntryText(credit)}`);
  return parts.join(". ");
}

/** Builds the player-facing `content` and GM-only `lore` for a proposal. */
export function buildCreatureEntryText(
  proposal: CreatureProposal,
  source: AdventureJsonV1["source"],
  artCredit?: string,
): CreatureEntryText {
  const blocks: string[] = [];
  blocks.push(...proposal.summary.map(escapeEntryText));
  blocks.push(...proposal.description.map(escapeEntryText));
  const labelled: Array<[string, string[]]> = [
    ["Role", proposal.role],
    ["Motivation", proposal.motivation],
    ["Disposition", proposal.disposition],
  ];
  for (const [label, values] of labelled) {
    for (const value of values)
      blocks.push(`**${label}:** ${escapeEntryText(value)}`);
  }
  const visible = proposal.encounters.filter(
    (encounter) => encounter.visibility === "player-visible",
  );
  if (visible.length) {
    blocks.push(`**Appears in**\n${visible.map(encounterLine).join("\n")}`);
  }
  blocks.push(`*${sourceLine(source, artCredit)}*`);

  const hidden = proposal.encounters.filter(
    (encounter) => encounter.visibility === "gm-only",
  );
  const text: CreatureEntryText = { content: blocks.join("\n\n") };
  if (hidden.length) {
    text.lore = `**Appears in (GM only)**\n${hidden.map(encounterLine).join("\n")}`;
  }
  return text;
}
