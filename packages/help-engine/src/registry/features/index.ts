import type { FeatureEntry } from "../schema";
import { campaignGenerator } from "./campaign-generator";
import { entityConnections } from "./entity-connections";
import { graphView } from "./graph-view";
import { sessionHub } from "./session-hub";
import { tables } from "./tables";

/** The proof-of-concept feature registry (spec FR-011). */
export const FEATURE_REGISTRY: readonly FeatureEntry[] = [
  entityConnections,
  graphView,
  sessionHub,
  tables,
  campaignGenerator,
];
