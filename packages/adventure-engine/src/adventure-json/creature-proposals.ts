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
  visibility: Visibility;
}

export interface CreatureProposal {
  key: string;
  name: string;
  actorIds: string[];
  pages: number[];
  summary: string[];
  description: string[];
  role: string[];
  motivation: string[];
  disposition: string[];
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

function pushDistinct(list: string[], value: string | undefined): void {
  if (value && value.trim() && !list.includes(value)) list.push(value);
}

function toProposalEncounter(
  encounter: AdventureJsonEncounter,
): CreatureProposalEncounter {
  return {
    id: encounter.id,
    title: encounter.title ?? UNTITLED_ENCOUNTER,
    pages: sortedUnique(pagesOf(encounter.sourceRef)),
    visibility: encounter.visibility,
  };
}

/** Proposes one Creature per distinct actor name that an encounter references. */
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

  const proposals = new Map<string, CreatureProposal>();
  for (const actor of pkg.actors) {
    const linked = encountersByActor.get(actor.id);
    if (!linked) continue;
    const key = normalizeName(actor.name);
    let proposal = proposals.get(key);
    if (!proposal) {
      proposal = {
        key,
        name: actor.name,
        actorIds: [],
        pages: [],
        summary: [],
        description: [],
        role: [],
        motivation: [],
        disposition: [],
        encounters: [],
        concealed: false,
      };
      proposals.set(key, proposal);
    }
    mergeActor(proposal, actor, linked);
  }

  const ordered = [...proposals.values()];
  for (const proposal of ordered) {
    proposal.pages = sortedUnique(proposal.pages);
    const byId = new Map(
      pkg.encounters.map((encounter) => [encounter.id, encounter]),
    );
    proposal.encounters.sort(
      (a, b) =>
        pkg.encounters.indexOf(byId.get(a.id)!) -
        pkg.encounters.indexOf(byId.get(b.id)!),
    );
  }
  return ordered;
}

function mergeActor(
  proposal: CreatureProposal,
  actor: AdventureJsonActor,
  linked: AdventureJsonEncounter[],
): void {
  proposal.actorIds.push(actor.id);
  proposal.pages.push(...pagesOf(actor.sourceRef));
  for (const field of TEXT_FIELDS) pushDistinct(proposal[field], actor[field]);
  if (actor.visibility === "gm-only") proposal.concealed = true;
  for (const encounter of linked) {
    if (!proposal.encounters.some((item) => item.id === encounter.id)) {
      proposal.encounters.push(toProposalEncounter(encounter));
    }
    if (encounter.visibility === "gm-only") proposal.concealed = true;
  }
}

function formatPages(pages: number[]): string {
  if (pages.length === 0) return "";
  const first = pages[0]!;
  const last = pages[pages.length - 1]!;
  return first === last ? `p. ${first}` : `pp. ${first}–${last}`;
}

function encounterLine(encounter: CreatureProposalEncounter): string {
  const pages = formatPages(encounter.pages);
  return pages ? `- ${encounter.title} (${pages})` : `- ${encounter.title}`;
}

function sourceLine(
  source: AdventureJsonV1["source"],
  artCredit: string | undefined,
): string {
  const parts = [`Source: ${source.title}`];
  if (source.authors?.length) parts.push(`by ${source.authors.join(", ")}`);
  if (source.license) parts.push(`Licence: ${source.license}`);
  const credit = artCredit?.trim();
  if (credit) parts.push(`Art: ${credit}`);
  return parts.join(". ");
}

/** Builds the player-facing `content` and GM-only `lore` for a proposal. */
export function buildCreatureEntryText(
  proposal: CreatureProposal,
  source: AdventureJsonV1["source"],
  artCredit?: string,
): CreatureEntryText {
  const blocks: string[] = [];
  blocks.push(...proposal.summary);
  blocks.push(...proposal.description);
  const labelled: Array<[string, string[]]> = [
    ["Role", proposal.role],
    ["Motivation", proposal.motivation],
    ["Disposition", proposal.disposition],
  ];
  for (const [label, values] of labelled) {
    for (const value of values) blocks.push(`**${label}:** ${value}`);
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
