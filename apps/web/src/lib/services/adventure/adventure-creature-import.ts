import {
  buildCreatureEntryText,
  type AdventureJsonV1,
  type CreatureProposal,
} from "@codex/adventure-engine";
import type { Entity } from "schema";

export interface ExistingCreature {
  id: string;
  title: string;
  adventureSource?: Entity["adventureSource"];
}

export interface CreatureImportChoice {
  proposal: CreatureProposal;
  /** An existing creature this proposal matches; it is reused, never written. */
  existing?: ExistingCreature;
  include: boolean;
  hidden: boolean;
  file?: File;
  artCredit: string;
}

export interface CreatureImportDeps {
  getVaultId(): string | null;
  createEntity(
    type: "creature",
    title: string,
    data: Partial<Entity>,
  ): Promise<string>;
  saveImage(
    entityId: string,
    file: File,
    expectedVaultId?: string | null,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
}

export interface CreatureImportResult {
  created: number;
  reused: number;
  failures: string[];
  /** True when the Vault changed before every entry was handled. */
  interrupted: boolean;
}

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase();

/** Matches by package and actor id first, then by trimmed case-insensitive title. */
export function findExistingCreature(
  proposal: CreatureProposal,
  packageId: string,
  creatures: ExistingCreature[],
): ExistingCreature | undefined {
  const bySource = creatures.find(
    (creature) =>
      creature.adventureSource?.packageId === packageId &&
      creature.adventureSource.actorIds.some((id) =>
        proposal.actorIds.includes(id),
      ),
  );
  if (bySource) return bySource;
  const name = normalizeTitle(proposal.name);
  return creatures.find((creature) => normalizeTitle(creature.title) === name);
}

export function initialCreatureChoices(
  pkg: AdventureJsonV1,
  proposals: CreatureProposal[],
  creatures: ExistingCreature[],
): CreatureImportChoice[] {
  return proposals.map((proposal) => ({
    proposal,
    existing: findExistingCreature(proposal, pkg.id, creatures),
    include: true,
    hidden: proposal.concealed,
    artCredit: "",
  }));
}

function entityData(
  pkg: AdventureJsonV1,
  hash: string,
  choice: CreatureImportChoice,
): Partial<Entity> {
  const { proposal } = choice;
  const credit = choice.artCredit.trim();
  const { content, lore } = buildCreatureEntryText(
    proposal,
    pkg.source,
    choice.file ? credit : undefined,
  );
  const data: Partial<Entity> = {
    content,
    adventureSource: {
      packageId: pkg.id,
      packageVersion: pkg.version,
      packageHash: hash,
      actorIds: proposal.actorIds,
      encounterIds: proposal.encounters.map((encounter) => encounter.id),
      sourceTitle: pkg.source.title,
      ...(pkg.source.authors?.length
        ? { sourceAuthors: pkg.source.authors }
        : {}),
      ...(pkg.source.license ? { sourceLicense: pkg.source.license } : {}),
      ...(choice.file && credit ? { artCredit: credit } : {}),
    },
  };
  if (lore) data.lore = lore;
  if (choice.hidden) {
    data.labels = ["hidden"];
    data.visibility = "hidden";
  }
  return data;
}

const IMAGE_FAILURE = (name: string) => `${name}: created without its image.`;

async function createOne(
  pkg: AdventureJsonV1,
  hash: string,
  choice: CreatureImportChoice,
  deps: CreatureImportDeps,
  vaultId: string | null,
  result: CreatureImportResult,
): Promise<void> {
  const name = choice.proposal.name;
  let id: string;
  try {
    id = await deps.createEntity(
      "creature",
      name,
      entityData(pkg, hash, choice),
    );
  } catch {
    result.failures.push(`${name}: could not create the entry.`);
    return;
  }
  result.created += 1;
  if (!choice.file) return;
  if (deps.getVaultId() !== vaultId) {
    result.interrupted = true;
    return;
  }
  try {
    const saved = await deps.saveImage(id, choice.file, vaultId);
    if (!saved.ok) result.failures.push(IMAGE_FAILURE(name));
    if (deps.getVaultId() !== vaultId) result.interrupted = true;
  } catch {
    result.failures.push(IMAGE_FAILURE(name));
  }
}

/** Creates a Creature for each included, unmatched choice; never touches existing entries. */
export async function importCreatures(
  pkg: AdventureJsonV1,
  hash: string,
  choices: CreatureImportChoice[],
  deps: CreatureImportDeps,
): Promise<CreatureImportResult> {
  const vaultId = deps.getVaultId();
  const result: CreatureImportResult = {
    created: 0,
    reused: choices.filter((choice) => choice.existing && choice.include)
      .length,
    failures: [],
    interrupted: false,
  };
  for (const choice of choices) {
    if (choice.existing || !choice.include) continue;
    if (deps.getVaultId() !== vaultId) result.interrupted = true;
    else await createOne(pkg, hash, choice, deps, vaultId, result);
    if (result.interrupted) break;
  }
  return result;
}
