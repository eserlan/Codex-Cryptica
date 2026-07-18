import type { ImportWarning } from "./package";
import { type Clock, systemClock } from "../persistence";

export interface UnresolvedReference {
  fromRef: string;
  toRef: string;
  type: string;
  reason: string;
}

export interface AssetSkipped {
  id: string;
  reason: string;
}

export interface TypeFallback {
  sourceRef: string;
  sourceType: string | undefined;
}

export interface CommitFailure {
  ref: string;
  stage: "entity" | "connection" | "asset";
  message: string;
}

export interface DuplicateSkipped {
  fromRef: string;
  toRef: string;
  type: string;
}

export interface ImportReport {
  sourceSystem: string;
  sourceLabel: string;
  committedAt: number;
  entitiesCreated: number;
  entitiesUpdated: number;
  itemsSkipped: number;
  relationshipsCreated: number;
  unresolvedReferences: UnresolvedReference[];
  assetsImported: number;
  assetsSkipped: AssetSkipped[];
  typeFallbacks: TypeFallback[];
  duplicatesSkipped: DuplicateSkipped[];
  warnings: ImportWarning[];
  failures: CommitFailure[];
}

export function createEmptyReport(
  sourceSystem: string,
  sourceLabel: string,
  clock: Clock = systemClock,
): ImportReport {
  return {
    sourceSystem,
    sourceLabel,
    committedAt: clock.now(),
    entitiesCreated: 0,
    entitiesUpdated: 0,
    itemsSkipped: 0,
    relationshipsCreated: 0,
    unresolvedReferences: [],
    assetsImported: 0,
    assetsSkipped: [],
    typeFallbacks: [],
    duplicatesSkipped: [],
    warnings: [],
    failures: [],
  };
}
