# Quickstart: Entity Shelf

**Feature**: 156-entity-shelf | **Date**: 2026-08-12

Build order, and how to prove each slice works before moving to the next. The three user
stories are independently shippable; this follows their priority.

---

## Slice 0 — Foundations

1. `packages/entity-shelf` scaffold: `package.json`, ports, types. No logic yet.
2. `apps/web/src/lib/utils/idb.ts` → `DB_VERSION` 23, add `shelf_entries` (index `by-group`)
   and `shelf_journal`, each behind an `if (!db.objectStoreNames.contains(...))` guard like
   every other store in that upgrade callback.

**Verify**: open the app, confirm the upgrade runs cleanly from an existing v22 database
without disturbing existing stores. This is the one step whose failure mode is other people's
data, so check it against a populated profile, not a fresh one.

---

## Slice 1 — User Story 1 (P1): carry one entity across

Pure logic first, per Principle II.

3. `titles.ts` — collision detection and `Title (2)` suffixing, case-insensitive and trimmed
   (research R5). Tests: no collision leaves the title untouched; exact, differing-case, and
   whitespace collisions all suffix; suffixes increment past `(2)`.
4. `templates.ts` — value-free comparison via `exportPresentationTemplate` for presentation
   templates, `vaultId`-stripped comparison for schema templates (R6). Tests: identical
   templates reuse silently; differing ones raise a conflict; a template absent from the target
   is brought in.
5. `shelve.ts` — build an entry from an entity record plus its assets and templates. Tests:
   all three asset roles collected **including sound bite audio**; a missing asset file shelves
   without it rather than throwing; re-shelving replaces (I2).
6. `import.ts` — plan, journal, write, roll back. Tests: a failure at each write stage leaves
   nothing behind; rollback is idempotent; a journal found at startup is replayed.
7. `apps/web` adapters: `idb-shelf-store.ts`, `web-shelf-vault.ts`.
8. `shelf.svelte.ts` store, `ShelfPanel`, `ShelfEntryCard`, `ImportOutcomeSummary`.
9. `DetailHeader.svelte` → "Send to Shelf" (FR-001).

**Verify** (this is SC-002, and worth doing by hand once):
create an entity with a stat sheet on a custom template, an image, and a sound bite. Shelve it.
Switch vaults. Import. Compare field by field against the source — stat values, template
rendering, image, audio playback, labels, aliases, lore, dates. Only the id should differ.

---

## Slice 2 — User Story 2 (P2): move a connected group

10. `connections.ts` — resolve within the imported batch first, then against the target vault
    by title and alias; classify failures as `not-found` or `ambiguous` (FR-017/018). Tests:
    intra-batch edges always reconnect; a title match in the target reconnects; two matching
    candidates yield `ambiguous` and are dropped, never guessed; an unresolved edge never fails
    the import.
11. `TemplateConflictStep.svelte` — one step, each conflicting template once however many
    entities depend on it (FR-016a).
12. `TableContextMenu.svelte` and `graph-context-menu-controller.svelte.ts` → "Send to Shelf"
    on the existing multi-selection (FR-002).

**Verify**: four mutually connected entities, shelved together, imported into an empty vault —
all edges among the four present (SC-003). Then import the same group into a vault that already
holds one of their connection targets by name, and confirm it reconnects.

---

## Slice 3 — User Story 3 (P3): reusable stock and its limits

13. Cross-tab wiring: emit a shelf-changed event on the existing `AppEventBus`; each tab
    re-reads on receipt. **The event carries no payload** — `CrossTabBroadcaster` serialises
    with `JSON.stringify` and would silently drop blobs (R2).
14. Storage display and near-quota warning (FR-025); remove-entry and clear-all (FR-023).
15. `help-content.ts` entry and a `FeatureHint` covering FR-024's disclosure (Principle VII).

**Verify**: import one entry into three vaults in succession — it survives each (US3-1).
Delete a source vault, then import its entry — images and templates still arrive (SC-006).
Open two tabs; shelve in one, confirm the other updates without a reload.

---

## Watch for

- **Sound bite audio is a third asset type**, easily missed behind `image` and `thumbnail`.
  Entities arrive looking fine and fail only when someone hits play.
- **No user-facing string may say "tags"** (Principle XII). The `tags` field is preserved in
  the data; the word does not appear in outcome summaries, help content, hints, or cards.
- **Blobs cannot cross the cross-tab channel.** Broadcast a notification, re-read from storage.
- **`plan` and `import` stay separate.** No dialog may open inside the journalled write phase,
  or a closed tab strands a journal behind it.

## Done means

`bun run lint` and `bun run test` clean (Principle VI); `packages/entity-shelf` at or above the
70% coverage goal for new packages (Principle X); every acceptance scenario in the spec
exercised.
