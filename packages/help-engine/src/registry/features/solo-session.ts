import type { FeatureEntry } from "../schema";

export const soloSession: FeatureEntry = {
  id: "solo-session",
  title: "Solo Sessions",
  summary:
    "Play a campaign on your own from Play. Start a solo session, pick a map, and use the solo bar for quick rolls, the dice window, the Oracle, your journal, notes and scenes. No AI is needed.",
  channel: "production",
  routes: ["/(app)/play", "/(app)/map"],
  areas: ["other", "map"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "start-a-solo-session",
      title: "Start a solo session",
      steps: [
        "Open Play from the activity bar.",
        "Choose Start Solo Session, pick a map and keep the journal option on.",
        "Choose Start. The map opens with SOLO on, and the solo bar appears under the header.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "roll-from-the-solo-bar",
      title: "Roll from the solo bar",
      steps: [
        "Type a dice expression such as d20 or 2d6+1 into the quick roll box, then press Enter.",
        "The result shows in the bar. Press Enter on an empty box to roll the last expression again.",
        "Choose More dice to open the full dice window for tables, decks and history.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "end-a-solo-session",
      title: "End a solo session",
      steps: [
        "Choose End session in the solo bar.",
        "Choose whether to end the journal too, or keep it running.",
        "Nothing is deleted. Your journal, rolls, map and vault stay as they are.",
      ],
      actionIds: ["solo-session.open-help"],
    },
  ],
  helpIds: ["solo-session"],
  related: ["solo-adventure", "session-journal", "dice-roller", "vtt-map"],
  actions: [
    {
      id: "solo-session.open-help",
      action: {
        type: "openHelp",
        helpId: "solo-session",
        label: "Read: Solo Sessions",
      },
    },
  ],
};
