# Contract: Business / Enterprise Generator (#3627)

Public surface of `packages/generator-engine` (`business-*.ts`) and the in-app
vault save in `apps/web`. The authoritative type definitions are in
`packages/generator-engine/src/business-state.ts`; this file lists the functions
and their roles. Rules for each field are in [data-model.md](../data-model.md).

```text
//
 * Contract for the Business / Enterprise Generator (#3627).
 *
 * Public surface of `packages/generator-engine` (business-*.ts) and the
 * in-app vault save in `apps/web`. Types only; see data-model.md for rules.
 */

// --- Options ---------------------------------------------------------------

export type BusinessScale =
  "tiny" | "small" | "established" | "regional" | "major";
export type BusinessLegitimacy = "legitimate" | "grey" | "front" | "mixed";
export type BusinessWealth = "struggling" | "modest" | "comfortable" | "rich";
export type BusinessTone =
  "grounded" | "gritty" | "whimsical" | "dark" | "heroic";

export interface BusinessGeneratorOptions {
  genre?: string;
  businessType?: string;
  scale?: BusinessScale;
  legitimacy?: BusinessLegitimacy;
  wealth?: BusinessWealth;
  clientele?: string;
  location?: string;
  tone?: BusinessTone;
  campaignContext?: string;
  playersOwn?: boolean;
}

export type ResolvedBusinessOptions = Required<
  Omit<BusinessGeneratorOptions, "clientele" | "location" | "campaignContext">
> & { clientele: string; location: string; campaignContext: string };

// Genre id → curated business types (first entry is the reset default). */
export declare const BUSINESS_TYPES: Readonly<
  Record<string, readonly string[]>
>;

// --- Document --------------------------------------------------------------

export interface BusinessPerson {
  id: string;
  name: string;
  role: string;
  goal: string;
  style?: string;
  trait: string;
  pressure?: string;
}

export interface BusinessDependency {
  id: string;
  input: string;
  kind:
    | "materials"
    | "labour"
    | "transport"
    | "licence"
    | "magic"
    | "data"
    | "protection"
    | "finance";
  ifItFails: string;
}

export type BusinessRelationshipLabel =
  | "owned by"
  | "employs"
  | "supplied by"
  | "serves"
  | "competes with"
  | "regulated by"
  | "owes"
  | "protected by"
  | "located in"
  | "contracted by";

export interface BusinessRelationship {
  id: string;
  name: string;
  kind:
    | "competitor"
    | "supplier"
    | "patron"
    | "regulator"
    | "criminal"
    | "neighbour"
    | "faction";
  label: BusinessRelationshipLabel;
  reason: string;
  partyKind: "organisation" | "individual";
}

export interface BusinessManagement {
  strengths: string[];
  liabilities: string[];
  upgrades: string[];
  obligations: string[];
  successAttracts: string[];
}

export type BusinessSectionId =
  | "identity"
  | "operations"
  | "leadership"
  | `staff:${string}`
  | "clientele"
  | "dependencies"
  | "relationships"
  | "reputation"
  | "pressure"
  | "asset"
  | "secret"
  | "opportunity"
  | "complication"
  | "hooks"
  | "management";

export interface BusinessDocument {
  version: 1;
  options: ResolvedBusinessOptions;
  identity: {
    name: string;
    type: string;
    description: string;
    reputationLine: string;
    distinctive: string;
  };
  operations: {
    provides: string;
    payers: string;
    whyHere: string;
    mainIncome: string;
  };
  leadership: BusinessPerson;
  staff: BusinessPerson[];
  clientele: {
    typical: string;
    valuable: string;
    undesirable: string;
    excluded?: string;
  };
  dependencies: BusinessDependency[];
  relationships: BusinessRelationship[];
  reputation: { perception: string; consequence: string };
  pressure: string;
  asset: string;
  secret: string;
  opportunity: string;
  complication: string;
  hooks: string[];
  management?: BusinessManagement;
  fallbackSections: BusinessSectionId[];
}

// --- Generation ------------------------------------------------------------

export type Rng = () => number;

export declare function resolveBusinessOptions(
  options: BusinessGeneratorOptions,
  rng?: Rng,
): ResolvedBusinessOptions;

// Offline; always passes checkBusiness. */
export declare function generateBusinessLocal(
  options: BusinessGeneratorOptions,
  rng?: Rng,
): BusinessDocument;

export interface BusinessStagedDeps {
  send: (userMessage: string) => Promise<string>;
  onProgress?: (
    steps: Array<{ id: string; status: string; detail?: string }>,
  ) => void;
  signal?: AbortSignal;
  rng?: Rng;
}

//
 * Three stages (identity → connections → trouble) on one chat session.
 * A stage that is unusable after one retry falls back to local tables and its
 * sections are listed in `fallbackSections`. Aborts propagate.
 */
export declare function generateBusinessStaged(
  options: BusinessGeneratorOptions,
  deps: BusinessStagedDeps,
): Promise<BusinessDocument>;

// --- Checks ----------------------------------------------------------------

export type BusinessIssueCode =
  | "missing"
  | "hook-unanchored"
  | "legit-secret-criminal"
  | "staff-count"
  | "inventory-list"
  | "management-mismatch";

export interface BusinessIssue {
  section: BusinessSectionId;
  code: BusinessIssueCode;
  detail: string;
}

export declare function checkBusiness(doc: BusinessDocument): BusinessIssue[];

// Replaces each failing section from local tables; result has no issues. */
export declare function repairBusiness(
  doc: BusinessDocument,
  issues: BusinessIssue[],
  rng?: Rng,
): BusinessDocument;

// --- Regeneration ----------------------------------------------------------

export interface RegenerateBusinessSectionOptions {
  useAI: boolean;
  instruction?: string;
  send?: (userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
}

export interface RegenerateBusinessSectionResult {
  document: BusinessDocument;
  // Set when a person's name changed and was replaced elsewhere. */
  renamed?: { from: string; to: string };
  warnings: string[];
}

// Only `section` changes, apart from whole-word replacement of a renamed person. */
export declare function regenerateBusinessSection(
  doc: BusinessDocument,
  section: BusinessSectionId,
  options: RegenerateBusinessSectionOptions,
): Promise<RegenerateBusinessSectionResult>;

export declare function propagateRename(
  doc: BusinessDocument,
  from: string,
  to: string,
  except: BusinessSectionId,
): BusinessDocument;

// --- Rendering & adapters --------------------------------------------------

export declare function renderBusinessContent(doc: BusinessDocument): string;
export declare function renderBusinessLore(doc: BusinessDocument): string;

// --- Save plan -------------------------------------------------------------

export interface BusinessEntityDraft {
  type: "faction" | "character";
  title: string;
  content: string;
  lore?: string;
  labels: string[];
}

export type BusinessPartyChoice =
  | { kind: "match"; entityId: string; ticked: boolean }
  | {
      kind: "create";
      entityType: "faction" | "character";
      draft: BusinessEntityDraft;
      ticked: boolean;
    };

export interface BusinessSavePlan {
  business: BusinessEntityDraft & { collision?: string };
  people: Array<{
    personId: string;
    draft: BusinessEntityDraft;
    link: "owned by" | "employs";
    ticked: boolean;
    // Existing entity id with the same title; the save step offers rename or keep. */
    collision?: string;
  }>;
  parties: Array<{
    relationshipId: string;
    label: BusinessRelationshipLabel;
    choice: BusinessPartyChoice;
  }>;
  source?: {
    entityId: string;
    labelOptions: BusinessRelationshipLabel[];
    label: BusinessRelationshipLabel;
    ticked: boolean;
  };
}

export interface BuildBusinessSavePlanOptions {
  // Existing vault titles → entity id, keyed by trimmed lower-case title. */
  existingTitles: ReadonlyMap<string, string>;
  source?: {
    entityId: string;
    entityType: "location" | "character" | "faction";
  };
}

export declare function buildBusinessSavePlan(
  doc: BusinessDocument,
  options: BuildBusinessSavePlanOptions,
): BusinessSavePlan;

// Public-page handoff: business + ticked people as ImportDraft[]. */
export declare function buildBusinessImportDrafts(
  doc: BusinessDocument,
  tickedPersonIds?: readonly string[],
): unknown[];

// --- apps/web: in-app vault save ---------------------------------------------

export interface BusinessVaultGateway {
  createEntity(
    type: "faction" | "character",
    title: string,
    data: {
      content?: string;
      lore?: string;
      labels?: string[];
      status?: "active";
    },
  ): Promise<string | { id: string }>;
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
  ): Promise<unknown>;
  bulkDelete(ids: string[]): Promise<unknown>;
}

export interface BusinessVaultSaveResult {
  businessId: string;
  personIds: Record<string, string>;
  partyIds: Record<string, string>;
}

// Creates ticked entities, then connections; on any failure removes what it created and rethrows. */
export declare function saveBusinessToVault(
  plan: BusinessSavePlan,
  vault: BusinessVaultGateway,
): Promise<BusinessVaultSaveResult>;
```
