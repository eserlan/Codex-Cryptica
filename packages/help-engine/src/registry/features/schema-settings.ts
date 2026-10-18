import type { FeatureEntry } from "../schema";

export const schemaSettings: FeatureEntry = {
  id: "schema-settings",
  title: "Categories and Labels",
  summary:
    "Define your own categories in Settings, in the Schema tab: each has a name, a colour and an icon, and they colour and group your entries. The same tab lists the labels used across your vault. Reset to defaults restores the built-in categories straight away, with no confirmation.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["settings"],
  kinds: "any",
  tabs: ["schema"],
  workflows: [
    {
      id: "add-a-category",
      title: "Add your own category",
      steps: [
        "Open Settings, then the Schema tab.",
        "At the bottom of the category list, pick a colour, type a name and choose an icon.",
        "Choose ADD. A name that already exists is refused.",
      ],
      actionIds: ["schema-settings.open-settings", "schema-settings.open-help"],
    },
    {
      id: "change-or-remove-a-category",
      title: "Change or remove a category",
      steps: [
        "Open Settings, then the Schema tab.",
        "Edit a category's name in place, use its colour picker, or choose Change icon.",
        "Choose Delete category and confirm to remove one. Entries that used it are kept and fall back to the default style.",
      ],
      actionIds: ["schema-settings.open-settings"],
    },
    {
      id: "reset-categories",
      title: "Go back to the built-in categories",
      steps: [
        "Open Settings, then the Schema tab.",
        "RESET TO DEFAULTS restores the built-in categories immediately and asks for no confirmation. Categories you added are removed from the list.",
      ],
      actionIds: ["schema-settings.open-settings", "schema-settings.open-help"],
    },
    {
      id: "see-your-labels",
      title: "See the labels used in your vault",
      steps: [
        "Open Settings, then the Schema tab.",
        "Project Labels lists every label in use across your vault.",
      ],
      actionIds: ["schema-settings.open-settings"],
    },
  ],
  helpIds: ["categories-and-labels"],
  related: ["entity-templates"],
  actions: [
    {
      id: "schema-settings.open-settings",
      action: {
        type: "openPanel",
        panel: "settings-schema",
        label: "Open Schema settings",
      },
    },
    {
      id: "schema-settings.open-help",
      action: {
        type: "openHelp",
        helpId: "categories-and-labels",
        label: "Read: Categories and Labels",
      },
    },
  ],
};
