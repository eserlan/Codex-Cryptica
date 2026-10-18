# In-app help documentation pass — 2 October 2026

This pass corrects instructions and missing workflows in the existing Help library.
Article IDs remain stable; no public discovery pages or new dependencies are added.
The assistant continues to use the same library as its build-time knowledge source.

## Corrections verified against the repository

| Area                | Correction                                                                                                               | Implementation reference                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity revisions    | Side panel and Zen Mode controls, instructions, draft review, Apply Changes/Discard, guest restrictions                  | `components/entity/`, `RevisionInstructionModal.svelte`, `RevisionService.svelte.ts`, `packages/oracle-engine/src/executors/revise-executor.ts` |
| Oracle              | Revision entry points, separation from Help Assistant, missing /roll, /plot, /help and /clear commands                   | `config/chat-commands.ts`, `packages/oracle-engine/src/oracle-parser.ts`                                                                        |
| AI access           | Personal-key text connection is Gemini; image provider configured separately; no promise of free usage or faster replies | `InlineKeySetup.svelte`, `AISettings.svelte`, `packages/ai-engine/src/client-manager.ts`                                                        |
| Generator privacy   | A personal key still makes remote AI requests; AI Disabled selects local templates                                       | `packages/generator-engine/src/campaign-generator-service.ts`, `packages/ai-engine/src/text-generation-chat.service.ts`                         |
| Merge               | Direct merge writes immediately; wizard produces a reviewable draft                                                      | `packages/oracle-engine/src/executors/merge-executor.ts`, `MergeWizard.svelte`                                                                  |
| Graph               | Automatic grouping, visibility vs Redraw, hover behaviour; L toggles node labels                                         | `graph-keyboard.ts`, `GraphToolbar.svelte`, `packages/graph-engine/src/renderer/community-hulls.ts`                                             |
| Canvas              | Drawing exit instruction belongs in drawing steps; report preview and Save as note/Cancel                                | `CanvasHUD.svelte`, `open-canvas-report.ts`, `reports/ReportPanel.svelte`                                                                       |
| Appearance          | App Appearance is separate from World Genre Theme                                                                        | `ThemeSelector.svelte`, `WorldThemePicker.svelte`                                                                                               |
| Templates           | Stat sheets now live in Settings → Templates → Stat sheets                                                               | `TemplatesTab.svelte`                                                                                                                           |
| Vaults and metadata | NEW creates a local vault; local folders require mirroring; entity frontmatter uses title and labels                     | `VaultSwitcherModal.svelte`, `packages/schema/src/entity.ts`                                                                                    |
| Front page          | frontpage labels pin several cards, ordered by modification time                                                         | `world/front-page/front-page-entities.ts`                                                                                                       |
| Adventure           | Start form and active-session restore were missing from Help                                                             | `adventure/AdventureStart.svelte`, `AdventureSurface.svelte`                                                                                    |

Also clarified browser-local transcript storage versus remote AI replies, removed
implementation jargon from QuickNotes, corrected the Portable Backup settings path,
and removed unresolvable local screenshot references from Getting Started. Labels
are the user-facing term; article frontmatter retains its existing `tags` contract.

## Verification and limits

- New retrieval tests ask eight practical questions about revisions, local generators,
  personal keys, appearance, canvas reports, stat templates, keeping generator drafts and pinned front-page cards.
- A negative test confirms an unrelated baking question receives no match.
- Internal Help links are checked against included article IDs.
- Corpus metadata and registry references are validated by rebuilding the knowledge bundle.
- Corrected the evaluator: recall@3 now checks exactly the first three results,
  including both subjects of comparisons. Earlier 86–87% figures incorrectly
  included the fourth result and should not be treated as recall@3.
- The corrected baseline was 85% overall (88% tune, 79% legacy holdout).
  Documentation and retrieval changes reach 89% overall (88% tune, 93% legacy
  regression). The inspected old holdout is now explicitly labelled regression.
- Retrieval prioritises distinct relevant sources before repeated sections,
  recognises ordinary wording such as “makes”, “gossip” and US “rumor”, and
  retains the existing relevance thresholds. Added explicit rename instructions
  and map/canvas, pins/connections, map fog/entity visibility and Shelf/import
  comparisons.
- A fresh agent-authored set was frozen before retrieval changes and evaluated
  once after tuning: **27/30 (90%) recall@3**, 29/30 answerable, and **10/10
  unrelated questions rejected**. This is retrieval coverage, not a claim that
  90% of model-generated answers are correct. The small set is not an external
  independent benchmark.
- Frozen fixture SHA-256:
  `9ffcab13fdc4c51b87699de87569c79d90388c14a9d5d80b10fb7f32460c92c9`.
  Reproduce with `bun packages/help-engine/tests/eval/run.ts --fresh-holdout`.
  Do not tune against this set; it becomes regression evidence after inspection.
- Fresh misses: correcting a misspelled character name (below relevance floor),
  geography versus investigation boards (canvas fourth), and publishing versus
  exporting for safekeeping (publishing absent). Further improvements need a new
  frozen evaluation set.
- Validation for the submitted branch: 184 impacted tests passed across the
  web app (65), Oracle proxy (31) and help engine (88); changed-file ESLint
  and formatting passed; Svelte check reported 0 errors and 79 warnings; the
  knowledge bundle contains 245 chunks and 41 Help articles.

The key-entry UI itself still mixes OpenAI/Luna labels with the Gemini implementation.
The guide now identifies the supported personal-key provider; harmonising the UI is
separate implementation work. This pass does not verify external provider pricing,
every feature end to end, or the factual accuracy of live model-generated answers.
