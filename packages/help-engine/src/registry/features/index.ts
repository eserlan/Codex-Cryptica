import type { FeatureEntry } from "../schema";
import { archiveImport } from "./archive-import";
import { backupAndRestore } from "./backup-and-restore";
import { campaignGenerator } from "./campaign-generator";
import { canvas } from "./canvas";
import { entityConnections } from "./entity-connections";
import { entityEditing } from "./entity-editing";
import { graphView } from "./graph-view";
import { sessionHub } from "./session-hub";
import { tables } from "./tables";
import { vttMap } from "./vtt-map";

/** The proof-of-concept feature registry (spec FR-011). */
export const FEATURE_REGISTRY: readonly FeatureEntry[] = [
  entityConnections,
  graphView,
  sessionHub,
  tables,
  campaignGenerator,
  canvas,
  vttMap,
  entityEditing,
  backupAndRestore,
  archiveImport,
];
