import type { Token, VTTMessage } from "../../../types/vtt";

/** Selection transitions share the facade's reactive fields and preserve selection messages. */
export class VTTTokenSelection {
  constructor(
    private session: {
      tokens: Record<string, Token>;
      selection: string | null;
      selectedTokens: Set<string>;
    },
    private emit: (message: VTTMessage) => void,
  ) {}

  setSelection(tokenId: string | null) {
    if (tokenId && !this.session.tokens[tokenId]) return;
    this.session.selection = tokenId;
    this.session.selectedTokens = new Set(tokenId ? [tokenId] : []);
    this.emit({ type: "TOKEN_SELECT", tokenId });
  }

  setMultiSelection(tokenIds: string[]) {
    this.session.selectedTokens = new Set(tokenIds);
    // Also set primary selection to first token
    this.session.selection = tokenIds.length > 0 ? tokenIds[0] : null;
    if (this.session.selection) {
      this.emit({ type: "TOKEN_SELECT", tokenId: this.session.selection });
    }
  }

  addToSelection(tokenId: string) {
    if (!this.session.tokens[tokenId]) return;
    const next = new Set(this.session.selectedTokens);
    next.add(tokenId);
    this.session.selectedTokens = next;
    if (!this.session.selection) this.session.selection = tokenId;
  }

  removeFromSelection(tokenId: string) {
    const next = new Set(this.session.selectedTokens);
    next.delete(tokenId);
    this.session.selectedTokens = next;
    if (this.session.selection === tokenId) {
      this.session.selection = next.values().next().value ?? null;
    }
  }

  clearSelection() {
    this.session.selection = null;
    this.session.selectedTokens = new Set();
    this.emit({ type: "TOKEN_SELECT", tokenId: null });
  }
}
