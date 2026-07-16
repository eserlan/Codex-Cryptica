export {
  FAMILY_CONNECTION_TYPES,
  isFamilyType,
  inverseFamilyType,
  type FamilyConnectionType,
} from "./family-types";

export {
  buildFamilyTree,
  isCharacter,
  toMember,
  relatedMembers,
  type FamilyMember,
  type FamilyTree,
  type FamilyRelation,
} from "./family-tree";

export { wouldCreateCycle } from "./cycle-detection";

export { resolveFamilyAlias, type FamilyAliasMatch } from "./family-aliases";

export {
  buildLineage,
  type Lineage,
  type LineageMember,
  type LineageMemberKind,
  type LineageEdge,
  type LineageEdgeType,
  type SiblingBranch,
  type Truncation,
  type BuildLineageOptions,
} from "./lineage";

export {
  layoutLineage,
  type PositionedLineage,
  type PositionedCard,
  type PositionedEdge,
  type CollapsedIndicator,
  type LayoutLineageOptions,
} from "./lineage-layout";
