import {
  emptyHelpContext,
  sanitizeHelpContext,
  type HelpArea,
  type HelpContext,
} from "help-engine";
import type { HelpSurfaceRegistry } from "./help-surface.svelte";

/** Where each fact about the screen comes from. Each is a small, explicit read. */
export interface HelpContextSources {
  /** SvelteKit route template (e.g. `/(app)/tables`), never a resolved path. */
  getRouteId: () => string | null;
  surfaces: HelpSurfaceRegistry;
  isGeneratorOpen: () => boolean;
  generatorsAvailable: () => boolean;
}

function areaFor(
  sources: HelpContextSources,
  routeId: string | null,
): HelpArea {
  if (sources.surfaces.entityDetail) return "entity-detail";
  if (sources.isGeneratorOpen()) return "generators";
  if (routeId === "/(app)/tables") return "tables";
  if (routeId === "/(app)") return "graph";
  return "other";
}

function flagsFor(
  sources: HelpContextSources,
  surface: HelpSurfaceRegistry["entityDetail"],
): string[] {
  const flags: string[] = [];
  if (sources.generatorsAvailable()) flags.push("generators");
  if (surface?.canAddConnection()) flags.push("connections-editable");
  return flags;
}

/** What is on screen and can be pointed at, by ID. The Add button lives on the Status tab. */
function availableActionsFor(
  surface: HelpSurfaceRegistry["entityDetail"],
): string[] {
  if (!surface) return [];
  const actions = ["status-tab", "connections-tab"];
  if (surface.activeTab() === "status" && surface.canAddConnection()) {
    actions.push("add-connection-button");
  }
  return actions;
}

/**
 * Builds the screen description sent with a help question. Everything goes
 * through `sanitizeHelpContext`, so whatever a provider reports, the result is
 * a valid description with no identifiers and no free text.
 */
export class HelpContextStore {
  constructor(private readonly sources: HelpContextSources) {}

  /** The current screen description. Reads live state each time. */
  get current(): HelpContext {
    try {
      const { sources } = this;
      const routeId = sources.getRouteId();
      const surface = sources.surfaces.entityDetail;

      return sanitizeHelpContext({
        routeTemplate: routeId,
        area: areaFor(sources, routeId),
        entityKind: surface?.entityKind() ?? null,
        tab: surface?.activeTab() ?? null,
        mode: surface?.isEditing() ? "edit" : "view",
        surface: "vault",
        flags: flagsFor(sources, surface),
        availableActions: availableActionsFor(surface),
      });
    } catch {
      // A misbehaving provider must never break help: fall back to "no idea
      // where the user is", which the assistant treats as a general question.
      return emptyHelpContext();
    }
  }

  /** A stable string for "is this the same screen as before?". */
  get signature(): string {
    const c = this.current;
    return [c.routeTemplate, c.area, c.entityKind, c.tab, c.mode].join("|");
  }
}
