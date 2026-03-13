import type { Entity } from "schema";

export type LocalEntity = Omit<Entity, "_path"> & {
  _path?: string[];
};

export interface EntityCreationRequest {
  type: string;
  title: string;
  initialData: Partial<Entity>;
}

export type BatchCreateInput = LocalEntity | EntityCreationRequest;
