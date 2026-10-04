import type { FeatureEntry } from "../schema";

export const soloAdventure: FeatureEntry = {
  id: "solo-adventure",
  title: "Solo Adventure",
  summary:
    "Play a persistent solo adventure grounded in your vault, with the Oracle as game master. Open Play from the activity bar, enter a title, premise and character name, and start. The session is saved with your vault; material invented in play is not added to it automatically.",
  channel: "production",
  routes: ["/(app)/adventure"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "start-an-adventure",
      title: "Start a solo adventure",
      steps: [
        "Open Play from the activity bar.",
        "Enter an Adventure title, a Premise and your Player character name, and optionally a Character description.",
        "Choose Start adventure, then respond to the situations the Oracle presents.",
      ],
      actionIds: ["solo-adventure.open-help"],
    },
    {
      id: "continue-an-adventure",
      title: "Continue an adventure",
      steps: [
        "Open Play from the activity bar.",
        "If this vault already has an active adventure, it is offered so you can carry on.",
        "Starting and continuing turns needs an available Oracle connection; a saved session stays readable offline.",
      ],
      actionIds: ["solo-adventure.open-help"],
    },
  ],
  helpIds: ["adventure-mode"],
  related: ["lore-oracle"],
  actions: [
    {
      id: "solo-adventure.open-help",
      action: {
        type: "openHelp",
        helpId: "adventure-mode",
        label: "Read: Solo Adventure Mode",
      },
    },
  ],
};
