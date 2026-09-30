import type { FeatureEntry } from "../registry/schema";

export interface HelpChunk {
  /** `<sourceId>#<n>`, stable for a given source and position. */
  id: string;
  sourceId: string;
  kind: "help" | "registry";
  /** The registry feature this chunk belongs to, used for context boosting. */
  featureId: string | null;
  /** The help article ID when this chunk is cited from `content/help`. */
  helpId: string | null;
  title: string;
  heading: string;
  text: string;
  hash: string;
}

export interface KnowledgeBundle {
  version: 1;
  commit: string;
  builtAt: string;
  channel: "production" | "staging";
  chunks: HelpChunk[];
  features: FeatureEntry[];
  /** IDs of the help articles included, for `openHelp` validation. */
  helpIds: string[];
}

export interface HelpArticleSource {
  id: string;
  title: string;
  content: string;
}
