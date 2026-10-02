import {
  emptyHelpContext,
  sanitizeHelpContext,
  type HelpArea,
  type HelpContext,
} from "help-engine";
import { SETTINGS_PANEL_IDS } from "help-engine";
import type { HelpSurfaceRegistry } from "./help-surface.svelte";

/** Where each fact about the screen comes from. Each is a small, explicit read. */
export interface HelpContextSources {
  /** SvelteKit route template (e.g. `/(app)/tables`), never a resolved path. */
  getRouteId: () => string | null;
  surfaces: HelpSurfaceRegistry;
  isGeneratorOpen: () => boolean;
  generatorsAvailable: () => boolean;
  /** The Settings tab that is open right now, or null when Settings is closed. */
  getOpenSettingsTab: () => string | null;
  /** Guest and demo vaults have no Settings guides: nothing there can be changed. */
  isGuestMode: () => boolean;
}

const ROUTE_AREAS: Record<string, HelpArea> = {
  "/(app)/tables": "tables",
  "/(app)/canvas": "canvas",
  "/(app)/map": "map",
  "/(app)/import": "import",
  "/(app)": "graph",
};

function areaFor(
  sources: HelpContextSources,
  routeId: string | null,
): HelpArea {
  // The most specific thing on top wins: an open Settings dialog covers
  // everything under it, then the generator dialog, then an open entry.
  if (sources.getOpenSettingsTab() !== null) return "settings";
  if (sources.isGeneratorOpen()) return "generators";
  if (sources.surfaces.zenEntityDetail || sources.surfaces.entityDetail)
    return "entity-detail";
  return (routeId && ROUTE_AREAS[routeId]) || "other";
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

function entityActionsFor(
  surface: HelpContextSources["surfaces"]["entityDetail"],
): string[] {
  if (!surface) return [];

  const actions: string[] = [];
  const canSwitchTabs = surface.canSwitchTabs?.() !== false;
  if (canSwitchTabs) actions.push("status-tab", "connections-tab");

  const onStatusTab = surface.activeTab() === "status";
  if (onStatusTab && surface.canAddConnection()) {
    actions.push("add-connection-button");
  }
  if (onStatusTab && surface.canGenerateRelated?.()) {
    actions.push("generate-related-button");
  }
  return actions;
}

/** What is on screen and can be pointed at, by ID. The Add button lives on the Status tab. */
function availableActionsFor(
  sources: HelpContextSources,
  surface: HelpSurfaceRegistry["entityDetail"],
): string[] {
  const actions = entityActionsFor(surface);
  // Settings is reachable from every screen of a real vault.
  if (!sources.isGuestMode()) actions.push(...SETTINGS_PANEL_IDS);
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
      const area = areaFor(sources, routeId);
      // The entry's own details only count while the entry is the screen.
      const surface =
        area === "entity-detail"
          ? (sources.surfaces.zenEntityDetail ?? sources.surfaces.entityDetail)
          : null;

      return sanitizeHelpContext({
        routeTemplate: routeId,
        area,
        entityKind: surface?.entityKind() ?? null,
        tab:
          area === "settings"
            ? sources.getOpenSettingsTab()
            : (surface?.activeTab() ?? null),
        mode: surface?.isEditing() ? "edit" : "view",
        surface: "vault",
        flags: flagsFor(sources, surface),
        availableActions: availableActionsFor(sources, surface),
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
