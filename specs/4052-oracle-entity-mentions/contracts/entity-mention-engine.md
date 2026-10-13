# Contract: `entity-mention-engine` (shared, framework-free)

No imports from Oracle, Cif or VTT Chat. All data access is injected.

```ts
interface Mention { entityId: string; displayName: string; entityType: string; start: number; end: number }

interface MentionSource {
  getEntity(id: string): EntityLike | undefined;      // active Vault only
  isVisible(entity: EntityLike): boolean;              // existing Vault visibility rules
  listCandidates(): Iterable<EntityLike>;              // titles + aliases of the active Vault
}

detectTrigger(text: string, caret: number): { query: string; start: number } | null
suggest(query: string, source: MentionSource, searchHits?: string[], limit?: number): MentionSuggestion[]
applySelection(text: string, trigger: Trigger, entity: EntityLike, mentions: Mention[]): { text: string; mentions: Mention[]; caret: number }
reconcile(prev: string, next: string, mentions: Mention[]): Mention[]   // shifts/drops on edit
resolve(text: string, mentions: Mention[], source: MentionSource): ResolveResult
serialize(mentions: Mention[], text: string): Mention[]                 // drops invalid, safe to store
```

Rules:

- `detectTrigger` returns null for `@` inside a word or email address.
- `suggest` and `resolve` call `isVisible` on every entity; hidden entities never appear in results.
- `resolve` never returns an entity for an `ambiguous` or `unmatched` name.
- Pure functions; same input gives same output.

## UI boundary (apps/web)

`EntityMentionPicker` props: `suggestions`, `loading`, `activeIndex`, `onSelect`, `onClose`, `anchorEl`. It owns layout, ARIA (`role="listbox"`, `aria-activedescendant`, live region for count) and touch targets, and nothing about Oracle. A consumer supplies its own `MentionSource`.

## Reuse notes

- **Cif**: provide a `MentionSource` limited to product or help items, or none; Cif keeps its own retrieval.
- **VTT Chat**: provide a table-scoped source and its own permission predicate.
