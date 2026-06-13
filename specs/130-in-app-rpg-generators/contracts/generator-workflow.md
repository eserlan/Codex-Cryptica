# Contract: Campaign Generator Workflow

This contract defines the app-facing behavior between the generator UI, campaign generator service, and vault persistence layer.

## Supported Generator Ids

- `npc`
- `faction`
- `settlement`
- `magic-item`

Unsupported ids must return a typed/user-readable failure and must not run generation.

## Registry Lookup

### Input

```ts
type GeneratorId = "npc" | "faction" | "settlement" | "magic-item";
```

### Output

```ts
interface CampaignGeneratorDefinition {
  id: GeneratorId;
  label: string;
  description: string;
  entityType: string;
  icon: string;
  options: GeneratorOptionDefinition[];
  defaults: Record<string, unknown>;
}
```

### Failure

- Unknown generator id returns or throws an `UnsupportedGeneratorError`.
- Failure message must be safe to show to users.

## Generate Draft

### Input

```ts
interface GeneratorRunRequest {
  generatorId: GeneratorId;
  options: Record<string, unknown>;
  useAI: boolean;
  themeId: string;
  launchMode?: "workspace" | "contextual";
  sourceEntityId?: string;
  relationshipLabel?: string;
  vaultContext?: GeneratorVaultContext;
}
```

```ts
interface GeneratorVaultContext {
  themeId?: string;
  themeName?: string;
  targetEntityType?: string;
  categoryLabels: Array<{ id: string; label: string }>;
  templateOutline?: string;
  sourceEntity?: VaultContextEntityExcerpt;
  neighbors: VaultContextEntityExcerpt[];
  existingTitles: string[];
  labelSuggestions: string[];
  includedContext: Array<
    "theme" | "schema" | "source" | "neighbors" | "titles" | "labels"
  >;
}

interface VaultContextEntityExcerpt {
  id: string;
  title: string;
  type: string;
  relationship?: string;
  contentExcerpt: string;
  loreExcerpt?: string;
  labels?: string[];
}
```

### Output

```ts
interface GeneratedDraft {
  title: string;
  entityType: string;
  summary: string;
  lore: string;
  labels: string[];
  sourceGeneratorId: GeneratorId;
  sourceEntityId?: string;
  relationshipLabel?: string;
}
```

### Required Behavior

- Must produce a draft for each supported generator when `useAI` is false.
- Must not mutate vault data.
- Must preserve labels as labels.
- Must not use `localStorage` for transfer.
- Must avoid full-vault AI context by default.
- Must consume campaign context only from `vaultContext`, not from direct vault store imports.
- Must tolerate an empty or user-trimmed `vaultContext`.

### Failure

- Invalid options return field-level validation feedback where possible.
- AI unavailable/failure must either fall back to non-AI generation or show a clear retry/fallback path.

## Save Draft

### Input

```ts
interface DraftSaveRequest {
  draft: GeneratedDraft;
  createRelationship: boolean;
  relationshipLabel?: string;
}
```

### Output

```ts
interface DraftSaveResult {
  entityId: string;
  relationshipCreated: boolean;
}
```

### Required Behavior

- Must require explicit user save.
- Must call the active vault entity creation path.
- Must optionally create a relationship only after entity creation succeeds.
- Must preserve the draft on failure.
- Must block guest/read-only saves.

### Failure

- Missing title or entity type blocks save.
- Guest/read-only state blocks save with clear user-facing text.
- Persistence failure leaves the draft in review state.

## UI Contract

- The workflow has configure, generating, review, saving, saved, error, and cancelled states.
- Form controls have visible labels.
- The primary generation action is a native submit action.
- Review fields are editable before save.
- Cancel/close before save leaves campaign data unchanged.
- Loading and error states are announced with accessible status or alert semantics.
- Existing Generate Related entry points in the entity sidebar and Zen Mode open this workflow with `launchMode: "contextual"` and `sourceEntityId`.
- Contextual launches show relationship controls before save and can create a source-to-generated relationship.
- The legacy standalone related-entity modal is not required once contextual workflow parity is complete.
- AI-backed contextual launches show a user-readable summary of included context categories before generation.
- Users can remove optional source or neighbor context before AI-backed generation.

## Vault Context Builder Contract

- The web app builds `GeneratorVaultContext` before calling package services.
- The package receives `GeneratorVaultContext` as plain data and must not import `vault`, `themeStore`, `categories`, or other app stores.
- Builder input may include active theme, categories, template service output, selected source entity id, graph connections, existing titles, and labels.
- Builder output must cap entity excerpts and neighbor count before generation.
- Default neighbor selection should prefer directly connected entities, explicit relationship labels, and entities with meaningful content.
- The context summary must distinguish theme/schema context from source/neighbor campaign content.
- Full campaign entity maps, full lore fields, full graph state, and API keys are never included in the packet.

## Public Generator Compatibility Contract

- Existing public NPC, Faction, Settlement, and Magic Item generator pages must keep their current routes.
- Public pages must delegate supported non-AI generation, defaults, and output mapping to `packages/generator-engine`.
- Public pages may keep page-specific SEO copy, discovery content, layout, and marketing-only controls in the web app.
- Public page adapters must not import campaign vault stores or require an active campaign.
- Equivalent supported generator options should resolve through the same package-owned option/default contract used by the in-app workflow.
- Public page regression tests must prove the primary public generation flows still complete after delegation to the package.
