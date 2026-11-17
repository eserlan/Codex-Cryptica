import type { FeatureEntry } from "../schema";

export const soloAdventure: FeatureEntry = {
  id: "solo-adventure",
  title: "Solo Adventure",
  summary:
    "Play a persistent solo adventure grounded in your vault, with the Oracle as game master. Start from Play with title, premise and character, or import an Adventure JSON package validated locally with no AI calls. Material invented in play is not added to your vault automatically.",
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
        "Open Play from the activity bar, then choose Let the Oracle run the game.",
        "Enter an Adventure title, a Premise and your Player character name, and optionally a Character description.",
        "Choose Start adventure, then respond to the situations the Oracle presents.",
      ],
      actionIds: ["solo-adventure.open-help"],
    },
    {
      id: "import-an-adventure",
      title: "Import an adventure",
      steps: [
        "Open Play from the activity bar, choose Let the Oracle run the game, then Import Adventure JSON (a ready owner Vault is required).",
        "Drop or choose an Adventure JSON v1 (.json) file up to 10 MiB; Markdown and text-based PDF are experimental local alternatives.",
        "Codex validates the file locally with zero AI calls; errors are shown exactly and nothing is written on failure or cancel.",
        "Review locations, actors, scenes, clues, and secrets (locked gm-only), then approve to save an immutable SHA-256 package, or cancel.",
        "Start a new session pinned to the approved package version and hash, or resume an existing pinned session; imported packages are not included in Cloud Backup.",
      ],
      actionIds: ["solo-adventure.open-help"],
    },
    {
      id: "continue-an-adventure",
      title: "Continue an adventure",
      steps: [
        "Open Play from the activity bar, then choose Let the Oracle run the game.",
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
