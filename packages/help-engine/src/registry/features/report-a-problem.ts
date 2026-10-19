import type { FeatureEntry } from "../schema";

export const reportAProblem: FeatureEntry = {
  id: "report-a-problem",
  title: "Report a Problem",
  summary:
    "Send a problem, idea or other feedback to the maintainer from anywhere in the app, without an account. Nothing is sent until you press Send.",
  channel: "production",
  routes: ["/(app)", "/(marketing)/generators/random"],
  areas: ["settings"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "view-guide",
      title: "Send a report",
      steps: [
        "Choose Report a problem from the Help window, Settings, the Cif panel or a campaign generator.",
        "Pick Something isn't working, I have an idea or Something else, then describe it.",
        "Check the list of what is sent, then press Send report and keep the reference you are given.",
      ],
      actionIds: ["report-a-problem.help"],
    },
  ],
  helpIds: ["report-a-problem"],
  related: ["lore-oracle"],
  actions: [
    {
      id: "report-a-problem.help",
      action: {
        type: "openHelp",
        helpId: "report-a-problem",
        label: "Read about reporting a problem",
      },
    },
  ],
};
