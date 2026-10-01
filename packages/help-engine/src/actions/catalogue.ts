/**
 * Closed catalogues of everything a guidance action may point at.
 *
 * Nothing outside these lists can be proposed, validated, or executed. Adding
 * an entry is a deliberate code change (and a review point), never something a
 * model, a retrieved document, or the browser can do at run time.
 */

/** The only action types that exist. None of them can change vault content. */
export const ACTION_TYPES = [
  "navigate",
  "openHelp",
  "openPanel",
  "highlight",
  "openGenerator",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Places `navigate` may go (mapped to real routes by the web app). */
export const DESTINATION_IDS = [
  "graph",
  "tables",
  "canvas",
  "map",
  "import",
] as const;
export type DestinationId = (typeof DESTINATION_IDS)[number];

/**
 * Panels `openPanel` may open: entity detail tabs (matching the real tab IDs)
 * and Settings tabs, written `settings-<tab>`. Only the Settings tabs the
 * registry gives guidance for are listed; there is none for About or Help.
 */
export const PANEL_IDS = [
  "status-tab",
  "connections-tab",
  "settings-vault",
  "settings-intelligence",
  "settings-schema",
  "settings-templates",
  "settings-theme",
  "settings-publishing",
] as const;
export type PanelId = (typeof PANEL_IDS)[number];

/** Generators `openGenerator` may open. */
export const GENERATOR_IDS = ["campaign"] as const;
export type GeneratorId = (typeof GENERATOR_IDS)[number];

/** Controls `highlight` may point at (`data-help-target` values). */
export const CONTROL_IDS = [
  "add-connection-button",
  "status-tab",
  "connections-tab",
] as const;
export type ControlId = (typeof CONTROL_IDS)[number];

/** Material flags a screen description may carry. */
export const HELP_FLAGS = ["generators", "connections-editable"] as const;
export type HelpFlag = (typeof HELP_FLAGS)[number];

export interface ControlSpec {
  /** Screen area the control lives in. */
  area: "entity-detail";
  /**
   * A flag the screen description must carry for the control to exist. The
   * Add button, for example, is absent in a read-only guest vault, so the
   * guide is not offered there.
   */
  requiresFlag?: HelpFlag;
  /**
   * The panel that must be open for the control to be on screen. A control
   * with no panel is always on screen within its area.
   */
  panel?: PanelId;
}

export const CONTROL_CATALOGUE: Record<ControlId, ControlSpec> = {
  "add-connection-button": {
    area: "entity-detail",
    panel: "status-tab",
    requiresFlag: "connections-editable",
  },
  "status-tab": { area: "entity-detail" },
  "connections-tab": { area: "entity-detail" },
};

/** Generators that need a flag present on the screen description. */
export const GENERATOR_REQUIRED_FLAG: Record<GeneratorId, HelpFlag> = {
  campaign: "generators",
};

/**
 * Every ID a screen description may list as currently available. The union of
 * the catalogues keeps the client from advertising anything the Worker would
 * not recognise.
 */
export const AVAILABLE_ACTION_IDS = Array.from(
  new Set<string>([
    ...CONTROL_IDS,
    ...PANEL_IDS,
    ...DESTINATION_IDS,
    ...GENERATOR_IDS,
  ]),
) as [string, ...string[]];
