import {
  buildCreatureEntryText,
  type AdventureJsonV1,
  type CreatureProposal,
} from "@codex/adventure-engine";
import type { Entity } from "schema";
import {
  runVaultScopedBatch,
  type VaultBatchContext,
} from "../vault-scoped-batch";

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

// Match the proposal builder's whitespace-collapsing, locale-neutral key.
const normalizeTitle = (title: string) =>
  title.trim().replace(/\s+/g, " ").toLowerCase();

/** Builds source-id and normalized-title indexes once for all proposals. */
function indexExistingCreatures(
  packageId: string,
  creatures: ExistingCreature[],
): {
  byActorId: Map<string, { creature: ExistingCreature; order: number }>;
  byTitle: Map<string, ExistingCreature>;
} {
  const byActorId = new Map<
    string,
    { creature: ExistingCreature; order: number }
  >();
  const byTitle = new Map<string, ExistingCreature>();
  creatures.forEach((creature, order) => {
    const title = normalizeTitle(creature.title);
    if (!byTitle.has(title)) byTitle.set(title, creature);
    if (creature.adventureSource?.packageId !== packageId) return;
    for (const actorId of creature.adventureSource.actorIds) {
      if (!byActorId.has(actorId)) byActorId.set(actorId, { creature, order });
    }
  });
  return { byActorId, byTitle };
}

export function initialCreatureChoices(
  pkg: AdventureJsonV1,
  proposals: CreatureProposal[],
  creatures: ExistingCreature[],
): CreatureImportChoice[] {
  const indexes = indexExistingCreatures(pkg.id, creatures);
  return proposals.map((proposal) => {
    let sourceMatch: { creature: ExistingCreature; order: number } | undefined;
    for (const actorId of proposal.actorIds) {
      const candidate = indexes.byActorId.get(actorId);
      if (candidate && (!sourceMatch || candidate.order < sourceMatch.order)) {
        sourceMatch = candidate;
      }
    }
    return {
      proposal,
      existing:
        sourceMatch?.creature ??
        indexes.byTitle.get(normalizeTitle(proposal.name)),
      include: true,
      hidden: proposal.concealed,
      artCredit: "",
    };
  });
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
    ...creatureImportMetadata(proposal, choice.hidden),
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
  return data;
}

const VISIBILITY_LABELS = new Set(["hidden", "revealed", "visible"]);

export function creatureImportMetadata(
  proposal: CreatureProposal,
  hidden: boolean,
): Partial<Pick<Entity, "aliases" | "labels" | "visibility">> {
  const aliases =
    proposal.aliases.length > 0 ? [...proposal.aliases] : undefined;
  const labels = [
    ...new Set([
      ...proposal.labels.filter(
        (label) => !VISIBILITY_LABELS.has(label.trim().toLowerCase()),
      ),
      ...(hidden ? ["hidden"] : []),
    ]),
  ];
  return {
    ...(aliases ? { aliases } : {}),
    ...(labels.length > 0 ? { labels } : {}),
    ...(hidden ? { visibility: "hidden" } : {}),
  };
}

const IMAGE_FAILURE = (name: string) => `${name}: created without its image.`;

async function createOne(
  pkg: AdventureJsonV1,
  hash: string,
  choice: CreatureImportChoice,
  deps: CreatureImportDeps,
  ctx: VaultBatchContext,
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
  if (!ctx.isVaultCurrent()) {
    result.interrupted = true;
    result.failures.push(
      `${name}: save could not be confirmed after the Vault changed.`,
    );
    return;
  }
  result.created += 1;
  if (!choice.file) return;
  if (!ctx.isVaultCurrent()) {
    result.interrupted = true;
    return;
  }
  try {
    const saved = await deps.saveImage(id, choice.file, ctx.vaultId);
    if (!saved.ok) result.failures.push(IMAGE_FAILURE(name));
    if (!ctx.isVaultCurrent()) result.interrupted = true;
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
  const toCreate = choices.filter(
    (choice) => !choice.existing && choice.include,
  );
  const result: CreatureImportResult = {
    created: 0,
    reused: choices.filter((choice) => choice.existing && choice.include)
      .length,
    failures: [],
    interrupted: false,
  };
  const batch = await runVaultScopedBatch(
    toCreate,
    (choice, ctx) => createOne(pkg, hash, choice, deps, ctx, result),
    { getVaultId: deps.getVaultId },
  );
  if (batch.interrupted) result.interrupted = true;
  return result;
}
