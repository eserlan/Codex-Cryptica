import type { FeatureEntry } from "../schema";

export const appNavigation: FeatureEntry = {
  id: "app-navigation",
  title: "Sidebar menu (Activity Bar)",
  summary:
    "The Activity Bar is the icon strip down the left side, or along the bottom on a phone. Views: Graph, Map, Canvas, Timeline, Table, Play, Rolls & Decks. Tools: Entities, Oracle, Generators, Shelf, Notes, Session Journal, Chat, Ask Cif. A phone keeps some in the menu drawer.",
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
      id: "find-a-missing-button",
      title: "Find a button that is not in the bar",
      steps: [
        "On a phone, open the menu drawer for Play, Rolls & Decks, Generators, Shelf, Notes, Session Journal and Chat.",
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
