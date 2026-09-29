# Quickstart: Canvas Entity Reports

For a reviewer or a future contributor who wants to see this feature working end-to-end, without reading the full plan.

## Try it (once implemented)

1. Open a Spatial Canvas with a few linked entities (or open any vault's Graph view, or its Table view).
2. **Canvas**: use the toolbar's "Generate report" button. **Graph view**: select a few nodes → "Generate report". **Table view**: check a few rows → "Generate report" in the bulk-actions bar.
3. Adjust Scope (canvas only) / Include / Detail in the panel and watch the live preview update.
4. Click **Save**. The report becomes a note in your vault (findable by title/search, labelled `report`), and opens in the same entity view/editor used for every other note — no report-specific screen.
5. Edit the report directly, the same way you'd edit any note — fix a name, reword a relationship line — and confirm it's saved like any other entity edit.
6. Reopen it later (e.g. from search or the vault list): your edits are still there. Generate a second report from the same source and confirm it becomes a separate note.
   6a. Use **Regenerate** on the report: after you edited it, you are warned before anything is overwritten; declining changes nothing. Try it on a report made from a Graph or Table selection too.
7. Use the report's export action to copy it as Markdown; paste into any Markdown-aware editor and confirm headings/structure survive.

## Where the pieces live

| Concern                                                                 | Location                                                                                                                                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure report formatting (no I/O)                                         | `packages/entity-report-engine/`                                                                                                                                        |
| Saving/regenerating/exporting the report entity                         | `apps/web/src/lib/services/report-service.ts`                                                                                                                           |
| The Scope/Include/Detail panel + preview (shared by all 3 entry points) | `apps/web/src/lib/components/reports/ReportPanel.svelte`, `ReportPreview.svelte`                                                                                        |
| Regenerate/Export actions on a saved report                             | `apps/web/src/lib/components/reports/ReportZenActions.ts`, rendered by `ZenHeader.svelte` for `kind: "report"` notes only (no new viewing surface — see research.md R3) |
| Canvas entry point                                                      | `apps/web/src/lib/components/canvas/canvas-report-generation.ts`                                                                                                        |
| Graph view entry point                                                  | `apps/web/src/lib/components/graph/graph-report-generation.ts`                                                                                                          |
| Table view entry point                                                  | `apps/web/src/lib/components/table/table-report-generation.ts`                                                                                                          |

## Fastest way to verify the core logic in isolation

`entity-report-engine` is framework-free — its tests don't need Svelte, a browser, or a vault:

```bash
bun test packages/entity-report-engine
```

`ReportService` and the three entry-point hooks are unit-testable with the same DI-mock pattern `delve-dossier-service.test.ts` already demonstrates in this codebase — that file is the fastest way to see the expected shape of `report-service.test.ts`.

## Prior art to read before writing code

- `apps/web/src/lib/services/delve-dossier-service.ts` (+ its test) — the note-creation/Zen-open pattern this feature reuses (research.md R1).
- `packages/vault-engine/src/services/GuestExporter.ts` — the connection-filtering and GM-secret-stripping pattern this feature reuses (research.md R2, spec FR-003/FR-019).
- `apps/web/src/lib/services/ClipboardService.ts` — the export mechanism (research.md R4).
- `apps/web/src/lib/components/graph/SelectionConnector.svelte` — the existing Cytoscape multi-selection primitive (research.md R5).
