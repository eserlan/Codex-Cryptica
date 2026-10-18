import type { FeatureEntry } from "../schema";

export const sessionHub: FeatureEntry = {
  id: "session-hub",
  title: "Session Hub",
  summary:
    "On the public generator pages, a list where every draft you generate collects, so you can reuse drafts as context, refine or share them, and save the ones you want to Codex.",
  channel: "production",
  routes: ["/(marketing)/generators/random"],
  areas: ["session-hub", "generators"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "keep-session-material",
      title: "Keep generated material for a session",
      steps: [
        "Generate something on the random generators page.",
        "Generated drafts appear in the Session Hub automatically.",
        "Choose which drafts to reuse as context or save to Codex.",
      ],
      actionIds: ["session-hub.read-help"],
    },
  ],
  helpIds: ["session-hub", "in-app-generators"],
  related: ["campaign-generator"],
  actions: [
    {
      id: "session-hub.read-help",
      action: {
        type: "openHelp",
        helpId: "session-hub",
        label: "Read about the Session Hub",
      },
    },
  ],
};
