import type { FeatureEntry } from "../schema";

export const relatedEntityGeneration: FeatureEntry = {
  id: "related-entity-generation",
  title: "Generate Related",
  summary:
    "From an entity's Status tab, Generate Related opens a generator with that entity and its nearby connections as context, then previews a new entity before it is kept.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: "any",
  tabs: ["status"],
  workflows: [
    {
      id: "generate-from-entity",
      title: "Draft a new entity from this one",
      steps: [
        "On the Status tab, choose Generate Related.",
        "Choose a generator and review its options and instructions.",
        "Generate a preview; Link to source controls whether a connection to this entity is added.",
        "Open in Editor to review the draft, then Apply Changes to keep it or Discard to remove it.",
      ],
      actionIds: ["related-generation.highlight"],
    },
  ],
  helpIds: ["generate-related"],
  related: ["campaign-generator", "entity-connections"],
  actions: [
    {
      id: "related-generation.highlight",
      action: {
        type: "highlight",
        target: "generate-related-button",
        label: "Generate Related is here",
      },
    },
  ],
};
