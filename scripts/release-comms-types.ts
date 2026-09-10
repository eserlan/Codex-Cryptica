export interface ReleaseFeature {
  name: string;
  why_users_care: string;
  /**
   * Whether this individual feature is worth its own standalone Bluesky
   * post, separate from the release's overall recommended_channels. Lets
   * one release surface several small, separately-postable wins instead of
   * forcing them into a single combined draft.
   */
  bluesky_worthy?: boolean;
}

export interface EvaluatorResult {
  postworthy: boolean;
  importance?: "low" | "medium" | "high";
  features?: ReleaseFeature[];
  recommended_channels?: string[];
  reason: string;
}

export interface WriterResult {
  /** One short standalone post per feature with bluesky_worthy: true. */
  bluesky: string[];
  /** Derived automatically from Bluesky copy with hashtags stripped. */
  discord?: string;
  reddit: string;
  github_discussion: string;
}

export interface ReleaseCommsHistoryEntry {
  sha: string;
  date: string;
  promoteRunId: string;
  postworthy: boolean;
  importance?: string;
  features?: ReleaseFeature[];
  recommendedChannels?: string[];
  reason: string;
  drafts?: WriterResult;
}

export interface ReleaseCommsState {
  version: 1;
  lastEvaluatedSha: string | null;
  history: ReleaseCommsHistoryEntry[];
}
