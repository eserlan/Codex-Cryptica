export type SyncDirection = "push" | "pull";

export interface SyncStats {
  updated: number;
  created: number;
  deleted: number;
  failed: number;
  total: number;
}
