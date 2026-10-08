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
      id: "save-a-discovery-to-the-vault",
      title: "Save a discovery to the Vault",
      steps: [
        "Open Recent in the solo bar. It lists the latest results in your running journal.",
        "Choose Save to Vault on the result, keep the suggested category or pick another, and check the name.",
        "Press Save. A draft is created and linked to its journal entry, and you stay on the same screen.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "generate-during-play",
      title: "Generate during play",
      steps: [
        "Open Generate in the solo bar and choose NPC, Encounter, Rumour or Complication, or All generators.",
        "Generate a result. It is recorded in your journal whether or not you keep it.",
        "Save it with the generator's usual Save; the journal notes the save.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "roll-a-pinned-table",
      title: "Roll a pinned table",
      steps: [
        "Open Pin a table in the solo bar and pin up to three of your tables.",
        "Tap a pinned table. The result shows in the bar and is recorded in your journal.",
        "Remove a pin with the × beside it.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "set-your-party",
      title: "Set your party",
      steps: [
        "Open Party in the solo bar, or choose the characters during setup.",
        "Tick the Character entries in your party. Choosing a name opens that character.",
        "Changes are noted in the journal while it runs.",
      ],
      actionIds: ["solo-session.open-help"],
    },
    {
      id: "return-to-an-earlier-scene",
      title: "Return to an earlier scene",
      steps: [
        "Open Scenes in the solo bar to see every scene in order.",
        "Choose Open to see that scene's part of the journal, or Return to scene to start a new visit.",
        "A new visit is numbered, such as Arrival (2), and gets its own journal section.",
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
