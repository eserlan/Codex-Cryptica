import type { FeatureEntry } from "../schema";

export const themeSettings: FeatureEntry = {
  id: "theme-settings",
  title: "Themes",
  summary:
    "Change how Codex Cryptica looks from Settings, in the Theme tab. App Appearance (System, Light or Dark) controls the interface; the World Genre Theme changes the colours, type and textures of your world content. Changes apply at once and are remembered in this browser.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["settings"],
  kinds: "any",
  tabs: ["theme"],
  workflows: [
    {
      id: "change-the-look",
      title: "Change the theme",
      steps: [
        "Open Settings, then the Theme tab.",
        "Under App Appearance, choose System, Light or Dark for the interface.",
        "Under World Genre Theme, pick a theme for your campaign content. Changes apply immediately.",
      ],
      actionIds: ["theme-settings.open-settings", "theme-settings.open-help"],
    },
  ],
  helpIds: ["themes"],
  related: [],
  actions: [
    {
      id: "theme-settings.open-settings",
      action: {
        type: "openPanel",
        panel: "settings-theme",
        label: "Open Theme settings",
      },
    },
    {
      id: "theme-settings.open-help",
      action: {
        type: "openHelp",
        helpId: "themes",
        label: "Read: Themes",
      },
    },
  ],
};
