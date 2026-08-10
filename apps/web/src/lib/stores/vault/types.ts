import type { Entity } from "schema";

export type LocalEntity = Omit<Entity, "_path"> & {
  _path?: string[];
  /** Bounded warm-start text; full content is loaded on demand. */
  contentPreview?: string;
  /** False/undefined until the full content record has been hydrated. */
  contentLoaded?: boolean;
};

export interface EntityCreationRequest {
  type: string;
  title: string;
  initialData: Partial<Entity>;
}

export type BatchCreateInput = LocalEntity | EntityCreationRequest;
