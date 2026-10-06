import {
  emptyHelpContext,
  sanitizeHelpContext,
  vttFlagsFor,
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
  /** Read-only overlay state, without any selected IDs or content. */
  getOpenHelpArea?: () => "session-journal" | "entity-reports" | null;
  journalAvailable?: () => boolean;
  /** Whether the sidebar panel host is visible. */
  isSidebarOpen?: () => boolean;
  /** The sidebar panel that is open beside the screen, if any. */
  getActiveSidebarTool?: () => "oracle" | "explorer" | "shelf" | "none";
}

const ROUTE_AREAS: Record<string, HelpArea> = {
  "/(app)/tables": "tables",
  "/(app)/canvas": "canvas",
  "/(app)/canvas/[slug]": "canvas",
  "/(app)/timeline": "chronology",
  "/(marketing)/tools/session-prep-builder": "session-prep",
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
  const overlay = sources.getOpenHelpArea?.();
  if (overlay) return overlay;
  if (sources.isGeneratorOpen()) return "generators";
  if (sources.surfaces.zenEntityDetail || sources.surfaces.entityDetail)
    return "entity-detail";
  return (routeId && ROUTE_AREAS[routeId]) || "other";
}

/** What the user is doing on the map counts only while the map is the screen. */
function mapFlagsFor(sources: HelpContextSources, area: HelpArea): string[] {
  const map = sources.surfaces.vttMap;
  return area === "map" && map ? vttFlagsFor(map.facts()) : [];
}

function flagsFor(
  sources: HelpContextSources,
  surface: HelpSurfaceRegistry["entityDetail"],
  area: HelpArea,
): string[] {
  const flags: string[] = [];
  flags.push(...mapFlagsFor(sources, area));
  if (sources.generatorsAvailable()) flags.push("generators");
  if (surface?.canAddConnection()) flags.push("connections-editable");
  // A side panel adds to the screen description instead of replacing the area.
  const panel = sources.isSidebarOpen?.()
    ? sources.getActiveSidebarTool?.()
    : "none";
  if (panel === "explorer") flags.push("explorer-open");
  if (panel === "shelf") flags.push("shelf-open");
  return flags;
}

function entityTabActions(
  surface: NonNullable<HelpSurfaceRegistry["entityDetail"]>,
): string[] {
  if (surface.canSwitchTabs?.() === false) return [];
  const tabs = ["status-tab", "connections-tab", "stats-tab", "timeline-tab"];
  if (surface.entityKind() === "character") tabs.push("family-tab");
  return tabs;
}

function entityActionsFor(
  surface: HelpContextSources["surfaces"]["entityDetail"],
): string[] {
  if (!surface) return [];

  const actions = entityTabActions(surface);

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
  if (!sources.isGuestMode() && sources.journalAvailable?.())
    actions.push("session-journal");
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
        flags: flagsFor(sources, surface, area),
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
