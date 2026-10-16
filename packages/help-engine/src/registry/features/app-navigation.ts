import type { FeatureEntry } from "../schema";

export const appNavigation: FeatureEntry = {
  id: "app-navigation",
  title: "Menus: sidebar and top bar",
  summary:
    "Activity Bar, left or bottom on a phone: Graph, Map, Canvas, Timeline, Table, Play, Rolls & Decks, Entities, Oracle, Generators, Shelf, Notes, Session Journal, Chat, Ask Cif. Top bar: Search, Create, Switch Vault, Manage vault, Save, Settings. A phone has a menu drawer.",
  channel: "production",
  // Not a screen: the bar is on every screen, so it is never matched by area.
  // Only an explicit question retrieves it, like any other feature.
  routes: ["/(app)"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "find-a-button",
      title: "Find out what a sidebar button does",
      steps: [
        "Hover over a button in the Activity Bar to see its name.",
        "Views take you to another screen: Graph, Map, Canvas, Timeline, Table, Play and Rolls & Decks.",
        "Tools open a panel or window on the current screen: Entities, Oracle, Generators, Shelf, Notes, Session Journal and Chat.",
        "Ask Cif is at the bottom of the bar.",
      ],
      actionIds: ["app-navigation.open-help"],
    },
    {
      id: "find-a-top-bar-control",
      title: "Find a control in the top bar",
      steps: [
        "Search and Create are in the top bar. Create is on wide screens only.",
        "Switch Vault is your vault's name. Manage vault holds Import data, Export backup and Share campaign.",
        "Save writes to a linked folder. Application Settings is the gear icon.",
        "Guided Mode hides the Die Roller, status icons, Manage vault, Save and Explore public worlds.",
      ],
      actionIds: ["app-navigation.open-help"],
    },
    {
      id: "find-a-missing-button",
      title: "Find a button that is not in the bar",
      steps: [
        "On a phone, tap the three-line Toggle menu button. The drawer holds every sidebar button plus the vault controls, Settings and Help.",
        "Generators wait until the vault is ready, and Chat is hidden when AI is off.",
        "In a shared world, Generators, Shelf, Notes and Session Journal are not shown.",
      ],
      actionIds: ["app-navigation.open-help"],
    },
  ],
  helpIds: ["finding-your-way-around"],
  related: [
    "graph-view",
    "canvas",
    "vtt-map",
    "chronology",
    "entity-table",
    "solo-session",
    "tables",
    "entity-explorer",
    "lore-oracle",
    "campaign-generator",
    "entity-shelf",
    "session-journal",
    "guided-mode",
    "archive-import",
    "backup-and-restore",
  ],
  actions: [
    {
      id: "app-navigation.open-help",
      action: {
        type: "openHelp",
        helpId: "finding-your-way-around",
        label: "Read: Finding your way around",
      },
    },
  ],
};
