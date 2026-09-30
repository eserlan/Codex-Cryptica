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
export type HelpTabId = "status" | "connections";

export interface EntityDetailSurface {
  /** Category ID of the open entry (sanitised to a built-in kind or `custom` later). */
  entityKind: () => string | null;
  activeTab: () => string;
  isEditing: () => boolean;
  /** False in a read-only (guest) vault, where the Add button does not exist. */
  canAddConnection: () => boolean;
  openTab: (tab: HelpTabId) => void;
}

export class HelpSurfaceRegistry {
  entityDetail = $state.raw<EntityDetailSurface | null>(null);

  /** Returns an unregister function; a newer registration is never removed by an older one. */
  registerEntityDetail(surface: EntityDetailSurface): () => void {
    this.entityDetail = surface;
    return () => {
      if (this.entityDetail === surface) this.entityDetail = null;
    };
  }
}

export const helpSurfaces = new HelpSurfaceRegistry();
