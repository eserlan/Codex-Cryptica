import type { DeckState, DeckStateStore } from "random-source-engine";
import type { RandomSourceFiles } from "./random-source-store.svelte";
import { DECK_DIR } from "./random-source-store.svelte";

/**
 * Per-deck draw state, stored beside the deck in the vault (#2247, R3).
 *
 * One file per deck. No device identity, no generation counter, no merge rule:
 * Google Drive transfer is an explicit whole-vault push/pull rather than live
 * sync, so two devices are never holding the same deck at once. Pulling a vault
 * brings its deck state along, which is exactly what a user expects.
 */
export class VaultDeckStateStore implements DeckStateStore {
  constructor(private files: RandomSourceFiles) {}

  async read(deckId: string): Promise<DeckState | undefined> {
    const text = await this.files.read(pathFor(deckId));
    if (!text) return undefined;
    try {
      const parsed = JSON.parse(text) as DeckState;
      // A corrupt state file must not make the deck unusable — treat it as an
      // untouched deck rather than propagating a parse error into a draw.
      if (!parsed || !Array.isArray(parsed.drawn)) return undefined;
      return { ...parsed, deckId };
    } catch {
      console.warn(
        `[DeckState] Unreadable state for deck ${deckId}; resetting`,
      );
      return undefined;
    }
  }

  async write(state: DeckState): Promise<void> {
    await this.files.write(
      pathFor(state.deckId),
      `${JSON.stringify(state, null, 2)}\n`,
    );
  }
}

export function pathFor(deckId: string): string {
  return `${DECK_DIR}/state/${deckId}.json`;
}
