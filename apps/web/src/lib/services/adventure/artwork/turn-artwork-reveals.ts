import type { AdventureSession, StateFact } from "@codex/adventure-engine";
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
  if (turns.length === 0) {
    return reveals;
  }

  let lastLocationKey: string | null = null;
  const assignedAssetByFactKey = new Map<string, string>();
  const usedAssetIds = new Set<string>();
  const activeChars = new Map<
    string,
    { fact: StateFact; name: string; lastShownSequence: number | null }
  >();

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

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i]!;
    let locationReveal: TurnArtworkReveal["location"];

    const patchLoc = turn.visiblePatch?.location;
    const locName =
      (patchLoc ? extractFactLabel(patchLoc) : undefined) ??
      (i === 0 && session.visibleState.location
        ? extractFactLabel(session.visibleState.location)
        : undefined);
    const locKey = locName?.trim().toLowerCase() ?? null;

    if (i === 0 || (patchLoc && locKey && locKey !== lastLocationKey)) {
      const targetPlaceId = locName
        ? resolvePlaceIdForLocationName(session, locName)
        : session.currentPlaceId;
      const placeSession: ArtworkPlaceSession = {
        ...session,
        currentPlaceId: targetPlaceId,
      };
      const selection = currentPlaceSelection(
        placeSession,
        activeVaultId,
        entities,
        enabled,
        catalogue,
        theme,
      );
      if (selection) {
        locationReveal = {
          name: locName ?? "Scene",
          selection,
        };
      }
      if (locKey) {
        lastLocationKey = locKey;
      }
    }

    const npcs: TurnNpcReveal[] = [];
    const charPatch = turn.visiblePatch?.activeCharacters;
    for (const removedId of charPatch?.removeIds ?? []) {
      activeChars.delete(removedId);
    }

    const addedIds = new Set<string>();
    const updatedIds = new Set<string>();

    const resolveNpc = (fact: StateFact): NpcPortraitSelection | null => {
      const npcSession: ArtworkNpcSession = {
        ...session,
        visibleState: {
          ...session.visibleState,
          activeCharacters: [fact],
        },
      };
      const factKey = extractFactLabel(fact).trim().toLowerCase() || fact.id;
      const assignedAssetId = assignedAssetByFactKey.get(factKey);
      if (assignedAssetId) {
        const pinnedAsset = catalogue.find(
          (asset) => asset.id === assignedAssetId,
        );
        if (pinnedAsset) {
          const pinnedSelection = selectPresentNpcPortrait(
            npcSession,
            activeVaultId,
            entities,
            enabled,
            theme,
            [pinnedAsset],
          );
          if (pinnedSelection) return pinnedSelection;
        }
      }

      const overallSelection = selectPresentNpcPortrait(
        npcSession,
        activeVaultId,
        entities,
        enabled,
        theme,
        catalogue,
      );
      const unusedCatalogue = catalogue.filter(
        (asset) => !usedAssetIds.has(asset.id),
      );
      const unusedSelection =
        unusedCatalogue.length > 0
          ? selectPresentNpcPortrait(
              npcSession,
              activeVaultId,
              entities,
              enabled,
              theme,
              unusedCatalogue,
            )
          : null;

      let selection = overallSelection;
      if (
        unusedSelection?.kind === "catalogue" &&
        overallSelection?.kind === "catalogue"
      ) {
        const factCues = new Set(
          (fact.cues ?? []).map((cue) => cue.toLowerCase()),
        );
        const countOverlap = (cues: readonly string[]) =>
          cues.filter((cue) => factCues.has(cue.toLowerCase())).length;
        if (
          factCues.size === 0 ||
          countOverlap(unusedSelection.asset.primaryCues) >=
            countOverlap(overallSelection.asset.primaryCues)
        ) {
          selection = unusedSelection;
        }
      } else if (unusedSelection && !overallSelection) {
        selection = unusedSelection;
      }

      if (selection?.kind === "catalogue") {
        assignedAssetByFactKey.set(factKey, selection.asset.id);
        usedAssetIds.add(selection.asset.id);
      }
      return selection;
    };

    for (const char of charPatch?.add ?? []) {
      addedIds.add(char.id);
      const name = extractFactLabel(char);
      activeChars.set(char.id, {
        fact: char,
        name,
        lastShownSequence: turn.sequence,
      });
      const selection = resolveNpc(char);
      if (selection) {
        npcs.push({
          id: char.id,
          name: selection.name || name,
          reason: "entered",
          selection,
        });
      }
    }

    for (const char of charPatch?.update ?? []) {
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

    for (const [id, entry] of activeChars.entries()) {
      if (addedIds.has(id)) continue;
      const neverShown = entry.lastShownSequence === null;
      const dueForReintro =
        entry.lastShownSequence !== null &&
        turn.sequence - entry.lastShownSequence >= reintroduceAfterTurns;
      if (!neverShown && !dueForReintro) {
        continue;
      }
      const mentioned =
        updatedIds.has(id) ||
        isCharacterMentionedInTurn(
          entry.name,
          turn.playerAction,
          turn.narration,
        );
      if (!mentioned) continue;
      const selection = resolveNpc(entry.fact);
      if (selection) {
        entry.lastShownSequence = turn.sequence;
        npcs.push({
          id,
          name: selection.name || entry.name,
          reason: neverShown ? "entered" : "reintroduced",
          selection,
        });
      }
    }

    if (locationReveal || npcs.length > 0) {
      reveals.set(turn.sequence, {
        ...(locationReveal ? { location: locationReveal } : {}),
        npcs,
      });
    }
  }

  return reveals;
}
