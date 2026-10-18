/**
 * Backward compatibility facade for graph presets, delegating to unified view presets.
 */
export {
  parseViewPresets as parsePresets,
  parsePresetState,
  legacyGraphPresetsSettingsKey as presetsSettingsKey,
  LEGACY_GRAPH_PRESETS_KEY_PREFIX as GRAPH_VIEW_PRESETS_KEY_PREFIX,
  type ViewPreset as GraphViewPreset,
  type ViewPresetState as GraphViewPresetState,
} from "./view-presets";
