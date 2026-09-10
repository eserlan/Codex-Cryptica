export interface ReleaseFeature {
  name: string;
  why_users_care: string;
}

export interface EvaluatorResult {
  postworthy: boolean;
  importance?: "low" | "medium" | "high";
  features?: ReleaseFeature[];
  recommended_channels?: string[];
  reason: string;
}

export interface WriterResult {
  bluesky: string;
  discord: string;
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
