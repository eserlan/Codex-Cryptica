/** Shared activity event type used by UIStore and SessionActivityService */
export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: "discovery" | "archive" | "update";
  title: string;
  entityType: string;
  entityId?: string;
  details?: string;
}
