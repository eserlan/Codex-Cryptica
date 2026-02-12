import type { Entity } from "schema";

export type LocalEntity = Entity & {
  _path?: string[];
};
