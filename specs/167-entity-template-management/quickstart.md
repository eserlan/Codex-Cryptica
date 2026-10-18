# Quickstart: Entity Template Management

## Manual verification

1. Open a local vault, then Settings → Templates. Confirm an **Entity templates** section lists one built-in per entity type, each with a Default marker.
2. Duplicate the built-in Faction template. Rename it, add a "Rituals" section with a hint, move a section, delete one, and check the live preview after each edit.
3. Save, then **Set as default** for Faction. Create a new Faction from the New Entity dialog and confirm its body matches the preview.
4. Open an entity created before the change and confirm it is unchanged. Edit the template again and confirm existing entities are still unchanged.
5. Delete the default template. Create a Faction and confirm the built-in structure is used.
6. Export the template, then import it into a second vault. Confirm identical sections and a distinguishable name if duplicated.
7. Import a garbage `.json` file and confirm a clear error and no change.
8. Put `character.md` in `.cc/templates/` (and an empty `location.md`). Reload and confirm Character uses the file, Location is blank, and both appear as user templates.
9. Repeat step 3 from: mobile sheet, related-entity dialog, a generator, and an Oracle draft. All must use the same structure.
10. Open a guest/read-only vault. Confirm templates are viewable and previewable but mutating actions are hidden with an explanation.
11. Inspect `.codex/templates/` for `{id}.json` and `defaults.json`; if a folder is linked, check whether they appear there (research R-005).

## Impacted-only validation (per AGENTS.md; never repo-wide)

```bash
bun run lint:changed
bun run test:changed
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bun scripts/affected-workspaces.mjs
cd packages/entity-template-engine && bun test --coverage
```

Before any commit or push: `bunx fallow audit --format json --quiet --explain --gate-marker agent`. Before a PR: the `codex-review` specialist review.

## Success checks mapped to the spec

| Check                                                                       | Covers         |
| --------------------------------------------------------------------------- | -------------- |
| Existing entities unchanged after edit/delete/re-default (snapshot compare) | FR-017, SC-003 |
| Legacy `.md` output identical, including empty file                         | FR-016, SC-004 |
| Same structure from every creation path                                     | FR-019, SC-005 |
| Export → import round trip; invalid file rejected                           | FR-013, SC-006 |
| 50-section preview under 1 s                                                | SC-007         |
| Malformed file present, entity creation still works                         | FR-022, SC-008 |
