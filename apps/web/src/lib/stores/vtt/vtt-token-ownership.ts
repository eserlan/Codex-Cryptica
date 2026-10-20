import type { Token, TokenStateUpdateInput } from "../../../types/vtt";
import type { MapLayer } from "map-engine";

/** Ownership, visibility and movement permissions for the current token collection. */
export class VTTTokenOwnership {
  constructor(
    private deps: {
      broadcastSessionSnapshotNow: () => void;
      isLayerLocked: (layer: MapLayer) => boolean;
    },
    private session: {
      tokens: Record<string, Token>;
      updateToken: (id: string, updates: TokenStateUpdateInput) => Token | null;
    },
  ) {}

  toggleTokenVisibility(tokenId: string) {
    const token = this.session.tokens[tokenId];
    if (!token) return;
    const visibleTo = token.visibleTo === "all" ? "gm-only" : "all";
    // Guests had an empty body while the note was hidden, so reveal its text too.
    const updates: TokenStateUpdateInput = { visibleTo };
    if (visibleTo === "all" && token.kind === "note")
      updates.noteBody = token.noteBody ?? "";
    return this.session.updateToken(tokenId, updates);
  }

  setTokenOwner(
    tokenId: string,
    ownerPeerId: string | null,
    ownerGuestName: string | null = null,
  ) {
    const token = this.session.tokens[tokenId];
    if (!token) return null;
    return this.session.updateToken(tokenId, {
      ownerPeerId,
      ownerGuestName,
      visibleTo: token.visibleTo === "gm-only" ? "gm-only" : "all",
    });
  }

  rebindGuestOwnership(peerId: string, guestName: string) {
    return this.changeOwners(
      (token) =>
        token.ownerGuestName === guestName && token.ownerPeerId !== peerId,
      peerId,
    );
  }

  clearGuestOwnership(peerId: string) {
    return this.changeOwners((token) => token.ownerPeerId === peerId, null);
  }

  private changeOwners(
    matches: (token: Token) => boolean,
    ownerPeerId: string | null,
  ) {
    let changed = false;
    const nextTokens: Record<string, Token> = {};
    for (const tokenId in this.session.tokens) {
      if (!Object.hasOwn(this.session.tokens, tokenId)) continue;
      const token = this.session.tokens[tokenId];
      if (matches(token)) {
        changed = true;
        nextTokens[tokenId] = { ...token, ownerPeerId };
      } else {
        nextTokens[tokenId] = token;
      }
    }
    if (!changed) return false;
    this.session.tokens = nextTokens;
    this.deps.broadcastSessionSnapshotNow();
    return true;
  }

  canMoveToken(tokenId: string, peerId: string | null, isHost = false) {
    const token = this.session.tokens[tokenId];
    if (!token) return false;
    if (token.locked) return false;
    if (token.layer && this.deps.isLayerLocked(token.layer)) return false;
    if (isHost) return true;
    return token.ownerPeerId !== null && token.ownerPeerId === peerId;
  }

  isTokenVisible(
    tokenId: string,
    _peerId: string | null,
    isHost: boolean,
  ): boolean {
    const token = this.session.tokens[tokenId];
    if (!token) return false;
    if (isHost) return true;
    return token.visibleTo !== "gm-only";
  }
}
