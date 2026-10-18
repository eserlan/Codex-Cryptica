import type { FeatureEntry } from "../schema";

export const entityTemplates: FeatureEntry = {
  id: "entity-templates",
  title: "Entity Templates",
  summary:
    "Choose the default Markdown structure for new entities, preview built-in templates and manage your own templates without changing existing notes.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["settings"],
  kinds: "any",
  tabs: ["templates"],
  workflows: [
    {
      id: "view-guide",
      title: "Choose a starting structure",
      steps: [
        "Open Settings → Templates → Entity templates.",
        "Preview a built-in template, or duplicate it to edit your own copy.",
        "Set as default affects new entities only; shared or read-only vaults allow preview and export but not changes.",
      ],
      actionIds: ["entity-templates.settings", "entity-templates.help"],
    },
  ],
  helpIds: ["default-entity-templates", "sharing-templates"],
  related: ["entity-editing", "stat-sheets"],
  actions: [
    {
      id: "entity-templates.settings",
      action: {
        type: "openPanel",
        panel: "settings-templates",
        label: "Open template settings",
      },
    },
    {
      id: "entity-templates.help",
      action: {
        type: "openHelp",
        helpId: "default-entity-templates",
        label: "Read about entity templates",
      },
    },
  ],
};
