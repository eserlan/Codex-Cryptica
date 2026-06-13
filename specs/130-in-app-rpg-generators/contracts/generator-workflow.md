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
  sourceEntityId?: string;
  relationshipLabel?: string;
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

## Public Generator Compatibility Contract

- Existing public NPC, Faction, Settlement, and Magic Item generator pages must keep their current routes.
- Public pages must delegate supported non-AI generation, defaults, and output mapping to `packages/generator-engine`.
- Public pages may keep page-specific SEO copy, discovery content, layout, and marketing-only controls in the web app.
- Public page adapters must not import campaign vault stores or require an active campaign.
- Equivalent supported generator options should resolve through the same package-owned option/default contract used by the in-app workflow.
- Public page regression tests must prove the primary public generation flows still complete after delegation to the package.
