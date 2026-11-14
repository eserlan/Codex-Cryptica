import type {
  AdventureSession,
  CommittedAdventureTurn,
  StateFact,
} from "@codex/adventure-engine";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import {
  currentPlaceSelection,
  type ArtworkPlaceEntity,
  type ArtworkPlaceSession,
  type PlaceSelectionResult,
} from "./current-place-selection.js";
import { defaultArtworkCatalogue } from "./default-artwork-catalogue.js";
import {
  selectPresentNpcPortrait,
  type ArtworkNpcEntity,
  type ArtworkNpcSession,
  type NpcPortraitSelection,
} from "./npc-portrait-selection.js";

export const DEFAULT_REINTRODUCE_NPC_AFTER_TURNS = 8;

export interface TurnNpcReveal {
  id: string;
  name: string;
  reason: "entered" | "reintroduced";
  selection: NpcPortraitSelection;
}

export interface TurnArtworkReveal {
  location?: {
    name: string;
    selection: PlaceSelectionResult;
  };
  npcs: TurnNpcReveal[];
}

export interface ComputeTurnArtworkRevealsOptions {
  session:
    | (AdventureSession & ArtworkPlaceSession & ArtworkNpcSession)
    | null
    | undefined;
  activeVaultId: string | null | undefined;
  entities: Readonly<Record<string, ArtworkPlaceEntity & ArtworkNpcEntity>>;
  enabled: boolean;
  theme?: string;
  catalogue?: readonly ArtworkAsset[];
  reintroduceAfterTurns?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFactLabel(fact: Pick<StateFact, "text">): string {
  const beforePunctuation = fact.text.split(/[,(—–-]/)[0]?.trim() ?? "";
  return beforePunctuation || fact.text.trim();
}

function isCharacterMentionedInTurn(
  name: string,
  playerAction: string,
  narration: string,
): boolean {
  const haystack = `${playerAction}\n${narration}`;
  const trimmed = name.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/).filter((part) => part.length >= 3);
  const candidates = [trimmed, ...parts];
  return candidates.some((candidate) =>
    new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(haystack),
  );
}

function resolvePlaceIdForLocationName(
  session: AdventureSession & ArtworkPlaceSession,
  locationName: string,
): string | undefined {
  const normalized = locationName.trim().toLowerCase();
  const match = session.places?.find(
    (place) => place.name.trim().toLowerCase() === normalized,
  );
  return match?.id ?? session.currentPlaceId;
}

type ActiveCharEntry = {
  fact: StateFact;
  name: string;
  lastShownSequence: number | null;
};

interface TurnNpcResolutionContext {
  session: AdventureSession & ArtworkNpcSession & ArtworkPlaceSession;
  activeVaultId: string;
  entities: Readonly<Record<string, ArtworkNpcEntity>>;
  enabled: boolean;
  theme: string | undefined;
  catalogue: readonly ArtworkAsset[];
  assignedAssetByFactKey: Map<string, string>;
  usedAssetIds: Set<string>;
}

function seedInitialActiveChars(
  session: AdventureSession,
  turns: readonly CommittedAdventureTurn[],
): Map<string, ActiveCharEntry> {
  const activeChars = new Map<string, ActiveCharEntry>();
  const addedInTurns = new Set<string>();
  for (const turn of turns) {
    for (const char of turn.visiblePatch?.activeCharacters?.add ?? []) {
      addedInTurns.add(char.id);
    }
  }
  for (const fact of session.visibleState.activeCharacters ?? []) {
    if (addedInTurns.has(fact.id)) continue;
    activeChars.set(fact.id, {
      fact,
      name: extractFactLabel(fact),
      lastShownSequence: null,
    });
  }
  return activeChars;
}

function resolveTurnLocationName(
  turn: CommittedAdventureTurn,
  isFirstTurn: boolean,
  session: AdventureSession,
): string | undefined {
  const patchLoc = turn.visiblePatch?.location;
  if (patchLoc) return extractFactLabel(patchLoc);
  if (isFirstTurn && session.visibleState.location) {
    return extractFactLabel(session.visibleState.location);
  }
  return undefined;
}

function selectLocationArtwork(
  locName: string | undefined,
  ctx: TurnNpcResolutionContext,
): TurnArtworkReveal["location"] | undefined {
  const targetPlaceId = locName
    ? resolvePlaceIdForLocationName(ctx.session, locName)
    : ctx.session.currentPlaceId;
  const selection = currentPlaceSelection(
    { ...ctx.session, currentPlaceId: targetPlaceId },
    ctx.activeVaultId,
    ctx.entities,
    ctx.enabled,
    ctx.catalogue,
    ctx.theme,
  );
  return selection ? { name: locName ?? "Scene", selection } : undefined;
}

function resolveLocationRevealForTurn(
  turn: CommittedAdventureTurn,
  isFirstTurn: boolean,
  lastLocationKey: string | null,
  ctx: TurnNpcResolutionContext,
): { reveal?: TurnArtworkReveal["location"]; nextLocationKey: string | null } {
  const patchLoc = turn.visiblePatch?.location;
  const locName = resolveTurnLocationName(turn, isFirstTurn, ctx.session);
  const locKey = locName?.trim().toLowerCase() ?? null;
  if (!isFirstTurn && (!patchLoc || !locKey || locKey === lastLocationKey)) {
    return { nextLocationKey: lastLocationKey };
  }
  return {
    reveal: selectLocationArtwork(locName, ctx),
    nextLocationKey: locKey ?? lastLocationKey,
  };
}

function findPinnedNpcSelection(
  npcSession: ArtworkNpcSession,
  assignedAssetId: string | undefined,
  ctx: TurnNpcResolutionContext,
): NpcPortraitSelection | null {
  if (!assignedAssetId) return null;
  const pinnedAsset = ctx.catalogue.find(
    (asset) => asset.id === assignedAssetId,
  );
  if (!pinnedAsset) return null;
  return selectPresentNpcPortrait(
    npcSession,
    ctx.activeVaultId,
    ctx.entities,
    ctx.enabled,
    ctx.theme,
    [pinnedAsset],
  );
}

function pickDiverseNpcSelection(
  fact: StateFact,
  overall: NpcPortraitSelection | null,
  unused: NpcPortraitSelection | null,
): NpcPortraitSelection | null {
  if (unused?.kind !== "catalogue" || overall?.kind !== "catalogue") {
    return overall ?? unused;
  }
  const factCues = new Set((fact.cues ?? []).map((cue) => cue.toLowerCase()));
  if (factCues.size === 0) return unused;
  const countOverlap = (cues: readonly string[]) =>
    cues.filter((cue) => factCues.has(cue.toLowerCase())).length;
  return countOverlap(unused.asset.primaryCues) >=
    countOverlap(overall.asset.primaryCues)
    ? unused
    : overall;
}

function resolveNpcForTurn(
  fact: StateFact,
  ctx: TurnNpcResolutionContext,
): NpcPortraitSelection | null {
  const npcSession: ArtworkNpcSession = {
    ...ctx.session,
    visibleState: {
      ...ctx.session.visibleState,
      activeCharacters: [fact],
    },
  };
  const factKey = extractFactLabel(fact).trim().toLowerCase() || fact.id;
  const pinned = findPinnedNpcSelection(
    npcSession,
    ctx.assignedAssetByFactKey.get(factKey),
    ctx,
  );
  if (pinned) return pinned;

  const overall = selectPresentNpcPortrait(
    npcSession,
    ctx.activeVaultId,
    ctx.entities,
    ctx.enabled,
    ctx.theme,
    ctx.catalogue,
  );
  const unusedCatalogue = ctx.catalogue.filter(
    (asset) => !ctx.usedAssetIds.has(asset.id),
  );
  const unused =
    unusedCatalogue.length > 0
      ? selectPresentNpcPortrait(
          npcSession,
          ctx.activeVaultId,
          ctx.entities,
          ctx.enabled,
          ctx.theme,
          unusedCatalogue,
        )
      : null;

  const selection = pickDiverseNpcSelection(fact, overall, unused);
  if (selection?.kind === "catalogue") {
    ctx.assignedAssetByFactKey.set(factKey, selection.asset.id);
    ctx.usedAssetIds.add(selection.asset.id);
  }
  return selection;
}

function addTurnCharacters(
  chars: readonly StateFact[],
  sequence: number,
  activeChars: Map<string, ActiveCharEntry>,
  ctx: TurnNpcResolutionContext,
): { npcs: TurnNpcReveal[]; addedIds: Set<string> } {
  const npcs: TurnNpcReveal[] = [];
  const addedIds = new Set<string>();
  for (const char of chars) {
    addedIds.add(char.id);
    const name = extractFactLabel(char);
    activeChars.set(char.id, {
      fact: char,
      name,
      lastShownSequence: sequence,
    });
    const selection = resolveNpcForTurn(char, ctx);
    if (selection) {
      npcs.push({
        id: char.id,
        name: selection.name || name,
        reason: "entered",
        selection,
      });
    }
  }
  return { npcs, addedIds };
}

function updateTurnCharacters(
  chars: readonly StateFact[],
  activeChars: Map<string, ActiveCharEntry>,
): Set<string> {
  const updatedIds = new Set<string>();
  for (const char of chars) {
    updatedIds.add(char.id);
    const existing = activeChars.get(char.id);
    const name = extractFactLabel(char);
    if (existing) {
      existing.fact = char;
      existing.name = name;
    } else {
      activeChars.set(char.id, {
        fact: char,
        name,
        lastShownSequence: null,
      });
    }
  }
  return updatedIds;
}

function applyTurnCharacterPatches(
  turn: CommittedAdventureTurn,
  activeChars: Map<string, ActiveCharEntry>,
  ctx: TurnNpcResolutionContext,
): {
  npcs: TurnNpcReveal[];
  addedIds: Set<string>;
  updatedIds: Set<string>;
} {
  const charPatch = turn.visiblePatch?.activeCharacters;
  for (const removedId of charPatch?.removeIds ?? []) {
    activeChars.delete(removedId);
  }
  const { npcs, addedIds } = addTurnCharacters(
    charPatch?.add ?? [],
    turn.sequence,
    activeChars,
    ctx,
  );
  const updatedIds = updateTurnCharacters(charPatch?.update ?? [], activeChars);
  return { npcs, addedIds, updatedIds };
}

function revealReasonForMentionedChar(
  id: string,
  entry: ActiveCharEntry,
  turn: CommittedAdventureTurn,
  updatedIds: Set<string>,
  reintroduceAfterTurns: number,
): "entered" | "reintroduced" | null {
  const neverShown = entry.lastShownSequence === null;
  const dueForReintro =
    entry.lastShownSequence !== null &&
    turn.sequence - entry.lastShownSequence >= reintroduceAfterTurns;
  if (!neverShown && !dueForReintro) return null;

  const mentioned =
    updatedIds.has(id) ||
    isCharacterMentionedInTurn(entry.name, turn.playerAction, turn.narration);
  if (!mentioned) return null;
  return neverShown ? "entered" : "reintroduced";
}

function collectMentionedNpcReveals(
  turn: CommittedAdventureTurn,
  activeChars: Map<string, ActiveCharEntry>,
  addedIds: Set<string>,
  updatedIds: Set<string>,
  reintroduceAfterTurns: number,
  ctx: TurnNpcResolutionContext,
  npcs: TurnNpcReveal[],
): void {
  for (const [id, entry] of activeChars.entries()) {
    if (addedIds.has(id)) continue;
    const reason = revealReasonForMentionedChar(
      id,
      entry,
      turn,
      updatedIds,
      reintroduceAfterTurns,
    );
    if (!reason) continue;
    const selection = resolveNpcForTurn(entry.fact, ctx);
    if (!selection) continue;
    entry.lastShownSequence = turn.sequence;
    npcs.push({
      id,
      name: selection.name || entry.name,
      reason,
      selection,
    });
  }
}

export function computeTurnArtworkReveals(
  options: ComputeTurnArtworkRevealsOptions,
): Map<number, TurnArtworkReveal> {
  const reveals = new Map<number, TurnArtworkReveal>();
  const {
    session,
    activeVaultId,
    entities,
    enabled,
    theme,
    catalogue = defaultArtworkCatalogue.peek() ?? [],
    reintroduceAfterTurns = DEFAULT_REINTRODUCE_NPC_AFTER_TURNS,
  } = options;

  if (!enabled || !session || session.vaultId !== activeVaultId) {
    return reveals;
  }

  const turns = [...(session.turns ?? [])].sort(
    (a, b) => a.sequence - b.sequence,
  );
  if (turns.length === 0) return reveals;

  let lastLocationKey: string | null = null;
  const activeChars = seedInitialActiveChars(session, turns);
  const ctx: TurnNpcResolutionContext = {
    session,
    activeVaultId,
    entities,
    enabled,
    theme,
    catalogue,
    assignedAssetByFactKey: new Map<string, string>(),
    usedAssetIds: new Set<string>(),
  };

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i]!;
    const loc = resolveLocationRevealForTurn(
      turn,
      i === 0,
      lastLocationKey,
      ctx,
    );
    lastLocationKey = loc.nextLocationKey;

    const { npcs, addedIds, updatedIds } = applyTurnCharacterPatches(
      turn,
      activeChars,
      ctx,
    );
    collectMentionedNpcReveals(
      turn,
      activeChars,
      addedIds,
      updatedIds,
      reintroduceAfterTurns,
      ctx,
      npcs,
    );

    if (loc.reveal || npcs.length > 0) {
      reveals.set(turn.sequence, {
        ...(loc.reveal ? { location: loc.reveal } : {}),
        npcs,
      });
    }
  }

  return reveals;
}
