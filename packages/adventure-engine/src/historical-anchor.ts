/** Historical anchor public API. Implementations live in focused sibling modules. */
export { computeHistoricalEventFingerprint } from "./historical-anchor-fingerprint";
export {
  validateHistoricalAnchorCompatibility,
  type ValidateHistoricalAnchorCompatibilityInput,
} from "./historical-anchor-compatibility";
export {
  validateAndCreateHistoricalAnchor,
  type CreateHistoricalAnchorInput,
} from "./historical-anchor-creation";
export {
  deriveHistoricalAnchorProgress,
  transitionHistoricalAnchorProgress,
  type TransitionHistoricalAnchorProgressInput,
} from "./historical-anchor-progress";
export { detectHistoricalAnchorDrift } from "./historical-anchor-drift";
export {
  recordHistoricalAnchorDrift,
  resolveHistoricalAnchorDrift,
  type RecordHistoricalAnchorDriftInput,
  type ResolveHistoricalAnchorDriftInput,
} from "./historical-anchor-drift-mutations";
export {
  projectPlayerHistoricalAnchor,
  projectGmHistoricalAnchor,
} from "./historical-anchor-projections";
