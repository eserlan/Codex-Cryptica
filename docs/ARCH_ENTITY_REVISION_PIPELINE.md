# Architectural Guide: Entity Revision Pipeline

The entity revision pipeline turns existing entity material plus new intent into a reviewable or directly applied entity update. It covers instructed revision, smart apply, discovery, and auto-archive updates.

Product-wise, every path is the same family of operation: revise this entity using what we already know plus some new input. Implementation-wise, the modes differ only by source and priority:

- Instructed revision rewrites one selected entity from existing material plus user instructions.
- Smart apply, discovery, and auto-archive merge separate incoming material into an entity or draft.

This document describes the current flow and the implementation files that own it.

## 1. Vocabulary

| Term            | Meaning                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| Chronicle       | The concise, user-facing entity summary stored as `content`.                                  |
| Lore            | The richer reference layer stored as `lore`.                                                  |
| Incoming        | Newly generated or proposed chronicle/lore text from chat, discovery, or instructed revision. |
| Related context | Nearby connected entities passed to the model so the merge can preserve relationships.        |
| Category        | The allowed entity category list. Revision may return a validated `categoryId`.               |
| Revision        | Umbrella concept for changing an entity using current material plus new intent.               |
| Merge revision  | Revision mode that merges separate incoming material into an entity or draft.                 |
| Smart apply     | The Oracle store method that revises an incoming update against an existing entity.           |

## 2. Primary Files

| File                                                                 | Responsibility                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/lib/stores/oracle/revision-manager.svelte.ts`          | Web-facing revision manager. Gathers entity state, categories, and related context, then applies fallback behavior.      |
| `apps/web/src/lib/services/ai/text-generation.service.svelte.ts`     | Calls the AI model, builds revision input snapshots, parses JSON, validates category IDs, and logs pipeline diagnostics. |
| `apps/web/src/lib/services/ai/prompts/entity-revision.ts`            | Owns the revision prompt and output contract.                                                                            |
| `packages/oracle-engine/src/executors/chat-executor.ts`              | Applies revision during chat/discovery auto-archive flows.                                                               |
| `apps/web/src/lib/services/RevisionService.svelte.ts`                | Calls the shared revision pipeline for revision and creates the pending draft.                                           |
| `apps/web/src/lib/components/modals/RevisionInstructionModal.svelte` | Collects optional revision instructions/corrections from the user.                                                       |

## 3. High-Level Revision Modes

All entity updates now enter the same revision pipeline:

```text
Existing entity or shell draft
  + incoming content
  + user instructions/corrections
  + priority rule
  -> collect related entity context
  -> collect allowed categories
  -> build revision prompt
  -> model returns JSON
  -> parse and validate chronicle/lore/categoryId
  -> caller creates draft, updates entity, or creates entity
  -> optional connection discovery runs after create/update
```

The public modes are thin adapters over this core operation:

- Revision passes `source: "revise"`, current entity content, optional user instructions, and `priority: "instructions-first"`.
- Smart apply and discovery pass incoming chronicle/lore and `priority: "incoming-first"`.
- New discovery drafts use a shell entity with empty content/lore.

Revision itself does not own persistence. The caller decides whether the revised result becomes a pending draft, a direct vault update, or a newly created entity.

## 4. Entry Points

### Smart Apply

`OracleRevisionManager.reviseSmartApply(entityId, incoming)` is the main existing-entity path. It:

1. Loads the current vault entity.
2. Builds related entity context from the graph/vault.
3. Calls `textGeneration.reviseEntityUpdate(...)` when AI revision is available.
4. Falls back to appending incoming text when AI is unavailable or fails.

This path is used by manual apply-style flows where separate incoming material needs to be merged into an existing entity.

### Discovery Proposal For Existing Entity

`OracleRevisionManager.reviseDiscoveryProposal(proposal)` handles discovery suggestions that target an existing entity. It keeps the existing entity type, merges incoming chronicle/lore, and falls back to a conservative append if revision cannot run.

The package-level chat executor also performs this flow for auto-archive discovery results before updating the vault entity.

### Discovery Draft For New Entity

`OracleRevisionManager.reviseNewEntityDraft(title, type, draft)` revises a new draft against an empty shell entity:

```text
{ id: "", title, type, content: "", lore: "" }
```

The result may include a valid `categoryId`. Invalid or missing category IDs are ignored and the caller keeps the original type/category fallback.

The chat executor uses the same idea when auto-creating new discovery entities. For performance, new-entity revision is skipped for large discovery batches where `proposals.length >= 5`; raw draft content is used instead.

### Instructed Revision

Instructed revision is the selected-entity rewrite mode of the shared revision pipeline:

1. `RevisionInstructionModal` optionally collects user instructions/corrections and passes a named request to `RevisionService.revise({ entityId, instructions })`.
2. `RevisionService.revise(...)` calls `oracle.reviseEntity({ source: "revise", entityId, instructions, priority: "instructions-first" })`.
3. `OracleRevisionManager.reviseEntity(...)` gathers the existing record, related context, and categories.
4. `TextGenerationService.reviseEntityUpdate(...)` builds the revision prompt and returns JSON chronicle/lore/category output.
5. `RevisionService.revise(...)` creates a pending draft from the revised output.

The parsed result becomes a pending draft. Accepting the draft is a separate action that updates the vault entity.

It uses the same revision model call as every other update source. The user's correction directive is first-priority input, and the revised result is still reviewed as a draft before it is saved.

## 5. AI Revision Call

`TextGenerationService.reviseEntityUpdate(...)` is the central model call for entity revision. It:

1. Takes safe snapshots of existing entity state, incoming text, related entities, and categories.
2. Removes existing lore from the model input for guest-mode calls.
3. Builds the prompt with `buildEntityRevisionPrompt(...)`, including source, instructions, and priority when provided.
4. Calls `model.generateContent(prompt)`.
5. Extracts the first JSON object from the response.
6. Parses `content`, `lore`, and optional `categoryId`.
7. Accepts `categoryId` only if it appears in the allowed category list.

The prompt requires JSON-only output and defines the field contract:

```json
{
  "content": "final chronicle text",
  "lore": "final lore text",
  "categoryId": "optional allowed category id"
}
```

## 6. Prompt Rules

The prompt in `entity-revision.ts` tells the model to:

- Treat incoming text as the freshest source when it conflicts with the existing record.
- Merge overlapping facts instead of duplicating them.
- Keep chronicle concise and current.
- Keep lore richer, with backstory, relationships, secrets, and context.
- Use related entity context only to clarify relationships.
- Avoid inventing unsupported facts.
- Pick a single allowed `categoryId` when categories are provided.

User-controlled text is wrapped before insertion into the prompt so model instructions and user lore are kept separate.

## 7. Fallback Behavior

Fallbacks are intentionally conservative:

- Guest mode, disabled AI, or missing revision support bypasses the model.
- Existing-entity fallback keeps existing chronicle when needed and appends incoming lore/content.
- New-entity fallback returns the raw draft unchanged.
- Invalid category IDs are discarded.
- Model or parse failures are logged and do not block the user's update path.

This keeps vault operations usable when the AI service fails, while avoiding silent destructive replacement of existing records.

## 8. Privacy Boundaries

The vault remains local-first. Revision only sends the current entity, incoming text, related context, and category list for the active operation.

Guest-mode revision is normally bypassed by the manager. Where the lower-level text generation service is called with guest options, existing lore is removed from the model input.

## 9. Persistence And Side Effects

Revision returns merged text; callers perform persistence:

- Smart apply returns merged fields to the caller.
- Discovery auto-archive updates or creates vault entities.
- Instructed revision creates a pending draft, then accept updates the vault.
- Connection discovery may run after an entity is created or updated, depending on the user's discovery mode.

## 10. Extension Guidelines

When changing this pipeline:

1. Treat instructed revision, smart apply, discovery, and auto-archive as revision sources, not unrelated concepts.
2. Keep prompt changes in `entity-revision.ts`.
3. Use named request objects at orchestration boundaries; avoid positional handoffs for optional data such as revision instructions.
4. Validate model output before applying it to vault state.
5. Preserve fallback paths for AI-disabled, guest, parse-failure, and model-failure cases.
6. Add tests for both the expected merge path and at least one failure or bypass path.
7. Keep the package-level chat executor and web revision manager behavior aligned.
8. Do not add changelog entries for internal pipeline refactors unless the user-facing behavior changes.

## 11. Known Duplication

There are currently two revision orchestration surfaces:

- The web Oracle revision manager.
- The package-level chat executor auto-archive path.

This is intentional for now because the executor owns chat/discovery automation while the web manager owns UI-facing revision calls. Behavior changes should check both surfaces.
