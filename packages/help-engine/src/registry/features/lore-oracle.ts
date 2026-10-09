import type { FeatureEntry } from "../schema";

export const loreOracle: FeatureEntry = {
  id: "lore-oracle",
  title: "Lore Oracle",
  summary:
    "The Lore Oracle answers questions and drafts content grounded in your notes, can revise an entity description, and has chat commands like /create and /connect. Your question and relevant lore go to an AI service; AI Disabled in Settings stops that. Cif only explains the app.",
  channel: "production",
  routes: ["/(app)/oracle"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "ask-the-oracle",
      title: "Ask the Oracle about your world",
      steps: [
        "Open Lore Oracle and ask a question about your world.",
        "It pulls in relevant entity descriptions, Lore and connections to ground its answer.",
        "Check its suggestions against your notes before keeping them.",
      ],
      actionIds: ["lore-oracle.open-help"],
    },
    {
      id: "revise-an-entity",
      title: "Revise an entity's description with AI",
      steps: [
        "On an entity, click AI Revise Description (sparkles) near the title, or use the same button in the Zen Mode toolbar.",
        "Add optional instructions in Revise Description, then click Revise.",
        "Review the Chronicle and Lore draft. Apply Changes saves it; Discard keeps the original.",
      ],
      actionIds: ["lore-oracle.open-help"],
    },
    {
      id: "check-ai-access",
      title: "See or limit how AI is reached",
      steps: [
        "Open Settings, then the Intelligence tab, to see your connection mode and key controls.",
        "Turn on AI Disabled in Settings to stop AI assistance. Manual writing, connections, local roll tables and local generator templates keep working.",
      ],
      actionIds: ["lore-oracle.open-settings"],
    },
  ],
  helpIds: ["oracle-guide", "chat-commands"],
  related: ["entity-editing", "related-entity-generation"],
  actions: [
    {
      id: "lore-oracle.open-help",
      action: {
        type: "openHelp",
        helpId: "oracle-guide",
        label: "Read: The Lore Oracle",
      },
    },
    {
      id: "lore-oracle.open-settings",
      action: {
        type: "openPanel",
        panel: "settings-intelligence",
        label: "Open Intelligence settings",
      },
    },
  ],
};
