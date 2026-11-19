# Specification Analysis and Remediation

Date: 2026-11-12. Scope: spec, plan, research, data model, contracts, quickstart and tasks for `181-adventure-artwork`.

The user explicitly requested analysis **and remediation of all findings**. The analysis pass identified the items below; the subsequent authorised remediation updated documentation only. No runtime implementation, tests, asset generation, uploads or publication have been performed.

## Findings and disposition

| ID  | Category                    | Severity | Location                                                                     | Finding                                                                                                                                                                      | Remediation and final status                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Constitution/privacy        | CRITICAL | plan.md cloud exception; data-model.md compatibility; tasks T033–T036        | New canonical artwork fields/snapshots could travel with ordinary entity backups before the promised inclusion consent; previous removal wording retained that remote scope. | Resolved: one explicit off-by-default inclusion gate covers adventure documents AND canonical artwork metadata/private snapshot references across full/entity-delta/media payloads. Clone projections, remove newly excluded remote fields/media on revocation, keep ordinary already-consented entity images and all local data. Tests added to task descriptions/quickstart. |
| I1  | Identity/immutability       | HIGH     | data-model.md ArtworkAsset.version; spec FR-008; catalogue tasks             | A new metadata version could point an existing asset ID at visually different content, undermining Keep even with stable subject assignments.                                | Resolved: visual changes require a new immutable asset ID; metadata-only corrections cannot repoint the old picture. Kept variants retain digests; withdrawal uses the documented unavailable-picture fallback. Added discriminating policy/quickstart checks.                                                                                                                 |
| U1  | Underspecified input limits | MEDIUM   | data-model.md people/scenes; contracts subject adapter; T017                 | Optional visual query/scene cues were called bounded but had no finite count/string limit.                                                                                   | Resolved: at most 24 controlled IDs, each 1–64 characters; discard unknown/duplicate entries before matching, and do not reject valid narrative for bad optional cues.                                                                                                                                                                                                         |
| U2  | Snapshot validation         | HIGH     | research.md snapshot budgets; data-model.md snapshot source; contracts; T029 | “Allowlisted raster” left supported formats and MIME/signature agreement to discretion, weakening validation and exact-picture testing.                                      | Resolved: PNG/JPEG/WebP only; declared MIME, signature and bounded decode agree, positive integer dimensions/bytes, 16 MiB and 32-megapixel caps; unsupported pictures fail Keep without conversion or false success.                                                                                                                                                          |
| I2  | Dependency/parallelism      | MEDIUM   | tasks.md T003 and parallel examples                                          | Shared fixture creation appeared parallel with tests consuming those fixtures.                                                                                               | Resolved: T003 is an explicit prerequisite, not marked parallel; only disjoint test authoring runs after fixtures/contracts are ready.                                                                                                                                                                                                                                         |
| U3  | Task executability          | MEDIUM   | tasks.md T022, T027, T037, T046                                              | Help registration, publishing media enumeration and AI response changes used directory-level descriptions where concrete existing seams are available.                       | Resolved: tasks name lore-oracle feature registry, PublishingService.svelte.ts, adventure-response-schema.ts/adventure-generation.types.ts and their focused tests; parser tests must fail before validator changes.                                                                                                                                                           |

No findings remain open in this design pass. These conclusions concern artifact readiness, not proof that future implementation meets the contracts.

## Requirement coverage

A mapped task means explicit planned implementation or validation, not completed implementation. All tasks remain unchecked.

| Requirement | Has task? | Task IDs                                                                      | Coverage                                                               |
| ----------- | --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| FR-001      | Yes       | T007, T021, T044, T049, T055                                                  | Four catalogue types/genres with honest staged coverage                |
| FR-002      | Yes       | T006, T007, T021, T049                                                        | Provenance, immutable IDs, generated-only approval and ingestion       |
| FR-003      | Yes       | T008, T009, T014, T017, T063                                                  | Local deterministic selection, no extra AI/search request              |
| FR-004      | Yes       | T008, T009, T017, T062                                                        | Eligibility, neutral fallback, primary threshold and ties              |
| FR-005      | Yes       | T012, T015, T019, T023                                                        | Committed-only assignment, no ordinary-turn churn                      |
| FR-006      | Yes       | T041, T044, T045, T046, T048                                                  | Stable explicit scene identity; no mood-only transitions               |
| FR-007      | Yes       | T008, T009, T025, T030                                                        | Complete precedence table and unavailable explicit-source fallback     |
| FR-008      | Yes       | T024, T025, T029, T030, T032                                                  | Exact Keep, replace, dismiss, restore and cancellation                 |
| FR-009      | Yes       | T025, T030, T042, T047                                                        | Never overwrite entity.image or canon through artwork actions          |
| FR-010      | Yes       | T041, T044, T045, T047                                                        | Durable person registry, aliases, exact promotion links                |
| FR-011      | Yes       | T012, T016, T042, T047                                                        | Vault-scoped canonical preferences, local provisional identities       |
| FR-012      | Yes       | T015, T024, T026, T029, T033–T038                                             | Recovery, exact snapshots, owner restore and explicit cloud inclusion  |
| FR-013      | Yes       | T012, T016, T025, T030, T036, T047                                            | Lease/revision, narrow writes, save failure and promotion retry        |
| FR-014      | Yes       | T014, T017, T041, T043, T046, T063                                            | Visible-only matching and bounded non-blocking optional cues           |
| FR-015      | Yes       | T029–T032, T039, T040                                                         | US1 + US2 required together for first public release                   |
| FR-016      | Yes       | T013, T020, T043, T048                                                        | Modest current-subject display without transcript blocks               |
| FR-017      | Yes       | T028, T032, T040, T043, T054                                                  | Keyboard/focus, reserved dimensions and target viewports               |
| FR-018      | Yes       | T007, T011, T014, T018, T021, T063                                            | Lazy metadata, R2-only public bytes, safe requests and provenance      |
| FR-019      | Yes       | T018, T052–T060                                                               | Finite cache/download budgets, progress/cancel/retry and removal       |
| FR-020      | Yes       | T025, T028, T031, T053, T057, T058                                            | Disabled fetches, preserved choices and removed-pack suppression       |
| FR-021      | Yes       | T014, T017, T018, T023, T060                                                  | AI-independent matching and readable offline/text-only play            |
| FR-022      | Yes       | T022, T039, T050, T059, T064                                                  | Help grows with each shipped slice and cloud scope                     |
| FR-023      | Yes       | T004, T006, T008, T011–T014, T024–T028, T033, T041–T043, T052–T054, T061–T065 | Positive/negative contract, integration and browser verification       |
| SC-001      | Yes       | T012, T023, T043, T051                                                        | Repeat visits and five-turn zero-churn journey                         |
| SC-002      | Yes       | T008, T024–T026, T029, T030, T040                                             | Precedence, exact Keep and owner restore                               |
| SC-003      | Yes       | T006, T007, T021, T049                                                        | Every released stock asset generated, reviewed and evidenced           |
| SC-004      | Yes       | T008, T009, T014, T021, T049                                                  | Four-genre fixture set and intentional no-match cases                  |
| SC-005      | Yes       | T041–T048, T051                                                               | Alias/same-name/promotion identity continuity                          |
| SC-006      | Yes       | T011–T013, T018–T020, T023, T040                                              | Narration/action entry never awaits image fetch                        |
| SC-007      | Yes       | T028, T032, T040, T043, T054                                                  | Target viewports, keyboard and draft retention                         |
| SC-008      | Yes       | T014, T025, T028, T031, T040, T063                                            | No additional selection calls/private requests; disable prevents fetch |
| SC-009      | Yes       | T052–T060                                                                     | Offline completeness, cancellation/removal/eviction with saved choices |

## Task and constitution checks

- 65 sequential tasks: Setup 3, Foundation 7, US1 13, US2 17, US3 11, US4 9, final verification 5.
- 19 marked parallel opportunities: only disjoint fixture-independent tests after their prerequisites. Shared-file implementation and fixture consumers are explicitly serialised.
- No unmapped task: setup/foundation enable FR-001–FR-004/FR-012/FR-013, every story maps above, final verification maps FR-023 and the measurable criteria.
- TDD: positive and meaningful failure/cancel tests precede each changed behaviour; task generation itself does not need application tests.
- Library-first/DI: pure policy package, shared schemas, injected app IO; no new third-party dependency or canonical world store.
- Bounded responsibility: T001 audits actual large-file seams before implementation; new behaviour uses focused modules/components.
- Privacy: six cloud-exception conditions explicitly gate the expanded remote path. Guest metadata AND physical media manifests are tested. No private pictures enter shared R2.
- Discovery governance: not applicable, no new/repositioned indexable discovery page.
- Minimum public scope is US1 + US2 with T040 and applicable final gates. NPC identity and packs remain real subsequent work, not omitted requirements.

## Metrics after remediation

| Metric                                 | Value                             |
| -------------------------------------- | --------------------------------- |
| Buildable requirements                 | 32 (23 functional + 9 measurable) |
| Tasks                                  | 65                                |
| Requirements with task coverage        | 32/32 (100%)                      |
| Initially identified findings          | 6                                 |
| Remediated findings                    | 6                                 |
| Open critical/high/medium/low findings | 0/0/0/0                           |
| Unresolved placeholders                | 0                                 |
| Outstanding clarification questions    | 0                                 |

## Next action

The artifacts are ready for `/speckit-implement`, starting with Setup/Foundation and then the US1 + US2 release slice. Human-reviewed artwork assets remain a real implementation dependency; no task is complete merely because the design describes it. Before implementation/PR handoff, rerun impacted checks, Fallow and specialist review against actual code.
