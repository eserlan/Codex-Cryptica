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
  bluesky: Array<{ pageUrl: string; text: string }>;
  /** Derived automatically from Bluesky copy with hashtags stripped. */
  discord?: string;
  reddit: string;
  /** A long-form Discussion for a specific public page, when it clears the higher bar. */
  github_discussions: Array<{
    pageUrl: string;
    title: string;
    body: string;
  }>;
}

export interface ReleaseCommsPublications {
  bluesky: Array<{ pageUrl: string; url: string }>;
  githubDiscussions: Array<{ pageUrl: string; url: string }>;
  /** IDs of Discord destinations the derived announcement has been successfully delivered to. */
  discord?: string[];
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
  publications?: ReleaseCommsPublications;
  /** False while an external publish is resumable; omitted for older completed entries. */
  completed?: boolean;
}

export interface ReleaseCommsState {
  version: 1;
  lastEvaluatedSha: string | null;
  history: ReleaseCommsHistoryEntry[];
}
