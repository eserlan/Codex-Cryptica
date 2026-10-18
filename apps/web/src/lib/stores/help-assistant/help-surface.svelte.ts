import type { VttHelpFacts, VttPanelId } from "help-engine";

/**
 * What the help assistant is allowed to know about the screen, and the few
 * things it is allowed to do there.
 *
 * Screens register a small surface: read-only answers about where the user is,
 * plus `openTab`, the one thing a guidance action can do to them. The registry
 * exposes no entity IDs, names, or text, so a screen cannot leak vault content
 * to help by registering more than it should: the context schema has nowhere
 * to put it.
 */
export type HelpTabId =
  "status" | "connections" | "stats" | "family" | "timeline";

export interface EntityDetailSurface {
  /** Category ID of the open entry (sanitised to a built-in kind or `custom` later). */
  entityKind: () => string | null;
  activeTab: () => string;
  isEditing: () => boolean;
  /** False in a read-only (guest) vault, where the Add button does not exist. */
  canAddConnection: () => boolean;
  /** The Generate Related control is visible on the Status tab. */
  canGenerateRelated?: () => boolean;
  /** Zen Mode is a detail view without the side-panel tab strip. */
  canSwitchTabs?: () => boolean;
  openTab: (tab: HelpTabId) => void;
}

/**
 * The map screen's report of the user's own VTT state, as plain facts. It is
 * read each time a question is asked, so it is always current, and it has no
 * place for names, IDs or text.
 */
export interface VttMapSurface {
  facts: () => VttHelpFacts;
  /**
   * The VTT panels and controls this user can reach right now. Role-aware: a
   * player is never told about a GM control, so no guide is offered for it.
   */
  actions: () => string[];
  /** Opens a panel. UI only: nothing in the session, a token or the fog changes. */
  openPanel: (panel: VttPanelId) => boolean;
}

export class HelpSurfaceRegistry {
  entityDetail = $state.raw<EntityDetailSurface | null>(null);
  zenEntityDetail = $state.raw<EntityDetailSurface | null>(null);
  vttMap = $state.raw<VttMapSurface | null>(null);

  /** Returns an unregister function; a newer registration is never removed by an older one. */
  registerEntityDetail(surface: EntityDetailSurface): () => void {
    this.entityDetail = surface;
    return () => {
      if (this.entityDetail === surface) this.entityDetail = null;
    };
  }

  registerVttMap(surface: VttMapSurface): () => void {
    this.vttMap = surface;
    return () => {
      if (this.vttMap === surface) this.vttMap = null;
    };
  }

  registerZenEntityDetail(surface: EntityDetailSurface): () => void {
    this.zenEntityDetail = surface;
    return () => {
      if (this.zenEntityDetail === surface) this.zenEntityDetail = null;
    };
  }
}

export const helpSurfaces = new HelpSurfaceRegistry();
