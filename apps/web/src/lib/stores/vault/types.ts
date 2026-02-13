import type { Entity } from "schema";

export type LocalEntity = Omit<Entity, "_path"> & {
  _path?: string[];
};
