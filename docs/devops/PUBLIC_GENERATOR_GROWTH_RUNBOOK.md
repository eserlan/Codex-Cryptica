# Public Generator Growth Runbook (#4627)

This runbook defines how to measure the public generator to Codex continuation for [#4627](https://github.com/eserlan/Codex-Cryptica/issues/4627). It is the sibling of [POINT_CRAWL_FUNNEL_RUNBOOK.md](./POINT_CRAWL_FUNNEL_RUNBOOK.md) and reuses its QA exclusion and labelling rules by reference.

## Scope and pilot

The dashboard covers **all public generators**. Every generator event carries `generator_type`, which is the last segment of the page's canonical path (see `resolveGeneratorType` in `apps/web/src/lib/components/seo/generator-page-identity.ts`, passed as `generatorType` by `SEOGeneratorLayout.svelte`).

The pilot from #4624 / #4625 is highlighted by these `generator_type` values:

| Pilot generator | `generator_type` | Canonical path            |
| :-------------- | :--------------- | :------------------------ |
| NPC             | `npc`            | `/generators/npc`         |
| Point Crawl     | `point-crawl`    | `/generators/point-crawl` |
| Star System     | `star-system`    | `/generators/star-system` |

The D&D NPC page (`/generators/dnd-npc`) reports `dnd-npc`. Include it in an NPC view only if you want it, and say so on the chart.

## Event dictionary

Counting unit: **funnels count unique user-session pairs; action click counts are event totals.** Do not mix the two in one number.

| Event                                                                                                                          | Fires when                                                                                      | Key properties                                                                                                       | Counting unit                  |
| :----------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| `seo_entry`                                                                                                                    | A marketing landing with captured attribution (from 2026-10-25)                                 | `entry_page_type`, `acquisition_*`                                                                                   | user-session pair              |
| `generator_started`                                                                                                            | The visitor explicitly submits Generate. The silent auto-draft on page load never fires it      | `generator_type`                                                                                                     | user-session pair              |
| `generator_completed`                                                                                                          | An explicit generation succeeds (not on error, not the auto-draft)                              | `generator_type`                                                                                                     | user-session pair              |
| `public_generator_action_clicked`                                                                                              | A post-generation action is clicked                                                             | `generator_type`, `action`, plus `copy_target` for `copy` and `source` for `open_codex`                              | event total (clicks)           |
| `public_generator_action_clicked` `action = save_to_codex`                                                                     | Save to Codex is clicked, **before** staging                                                    | `generator_type`                                                                                                     | event total (clicks)           |
| `public_generator_action_clicked` `action = copy`                                                                              | A copy action is used                                                                           | `copy_target` in `markdown`, `section`, `session_hub_detail`, `inline`, `diagram_image`, `monsterlabs`               | event total (clicks)           |
| `public_generator_action_clicked` `action = reroll`                                                                            | Reroll is clicked                                                                               | `generator_type`                                                                                                     | event total (clicks)           |
| `public_generator_action_clicked` `action = open_codex`                                                                        | Open Codex is clicked                                                                           | `source` in `header`, `save_confirmation`                                                                            | event total (clicks)           |
| `generator_share_clicked`, `generator_share_created`, `generator_share_link_copied` (and the other `generator_share_*` events) | The Share outcome: click, snapshot stored, link copied                                          | `generator_type`, `source`                                                                                           | user-session pair for outcomes |
| `entity_saved`                                                                                                                 | The pending draft was written to this browser's `localStorage`. Read it as **handoff prepared** | `generator_type`, `is_hub_batch`, `item_count`, `is_first_saved_entity`                                              | user-session pair              |
| `vault_created`                                                                                                                | Same moment, on this browser's first-ever save. **Inferred**, not confirmed                     | `generator_type`, `is_hub_batch`, `item_count`                                                                       | user-session pair              |
| `related_entity_created`                                                                                                       | Same moment, when the content has links or references                                           | `generator_type`, `is_hub_batch`, `item_count`, `related_entity_count` (bucketed)                                    | user-session pair              |
| `generator_handoff_failed`                                                                                                     | Writing the pending draft to `localStorage` threw (for example blocked storage)                 | `generator_type`, `is_hub_batch`, `item_count_bucket` (`0`, `1`, `2-5`, `6+`). No text, titles, IDs or error message | user-session pair              |

Every event also carries the `acquisition_*` flat properties and `first_touch` / `latest_touch` when attribution was captured in the tab session.

## Intent, not persistence

This is **intent, not persistence**:

- `save_to_codex` is a click that fires before staging.
- `entity_saved` means the draft was written to this browser's storage. It does not mean it was imported.
- `vault_created` is inferred from a local flag.
- No event confirms import, and none will. Import success is checked by local deterministic tests.
- A session with `save_to_codex` but neither `entity_saved` nor `generator_handoff_failed` is **abandoned or in flight**, not failed.

## Dashboard definitions

Build these in Amplitude. Dashboard URL: `TODO: <add Amplitude dashboard URL>`.

- **(a) Organic same-session funnel**, ordered, counted by session: `seo_entry` (`acquisition_channel = organic_search`; add `acquisition_search_engine = google` for the Google view) -> `generator_started` -> `generator_completed` -> `public_generator_action_clicked` (`action = save_to_codex`) -> `entity_saved`.
- **(b) Post-generation funnel** for direct landings: starts at `generator_completed`, then `save_to_codex`, then `entity_saved`. No Answer or discovery step is needed.
- **(c) Post-completion outcomes chart**: Copy, Share and Reroll beside Save. These are **alternative outcomes, not failed conversions**.
- **(d) Handoff outcome chart**: `entity_saved` vs `generator_handoff_failed`.

Break each chart down by `generator_type`, `acquisition_channel`, `acquisition_search_engine`, device type and entry path (`acquisition_landing_path` / `entry_page_type`).

Attribution rule: an unset `acquisition_*` property is labelled **Unattributed**. Non-Google engines (Bing, DuckDuckGo, Yahoo, Ecosia, Brave) and AI referrals are **never counted as Google**.

## QA / synthetic exclusion

Apply the segment from Step 1 of [POINT_CRAWL_FUNNEL_RUNBOOK.md](./POINT_CRAWL_FUNNEL_RUNBOOK.md) (#4386), named `Human Visitors (Excl. QA & Bots)`, to every chart. It is not redefined here. Exclude known dev/QA tags and synthetic devices, never arbitrary users.

## Baseline

3 Nov 2026 Amplitude numbers. **Unfiltered, last 30 days, not QA-excluded, organic-attributed.** `seo_entry` starts 2026-10-25.

| Measure                                         | Value                 | Unit              |
| :---------------------------------------------- | :-------------------- | :---------------- |
| `seo_entry` organic user-sessions in the funnel | 143                   | user-session pair |
| reached `generator_started`                     | 57                    | user-session pair |
| reached `generator_completed`                   | 50 (about 35% of 143) | user-session pair |
| `save_to_codex` clicks                          | 4                     | click events      |
| `copy` clicks                                   | 8                     | click events      |
| `reroll` clicks                                 | 11                    | click events      |
| `open_codex` clicks                             | 8                     | click events      |
| `entity_saved`                                  | 3                     | unique users      |

## Post-release template

Annotations: #4624 / #4625 release date: `TBD`. This change (`generator_handoff_failed`) release date: `TBD`.

| Measure                                      | Count | Denominator | Rate | Sample size | Uncertainty interval |
| :------------------------------------------- | :---- | :---------- | :--- | :---------- | :------------------- |
| Eligible completed sessions                  |       |             |      |             |                      |
| CTA-exposed sessions (not instrumented yet)  |       |             |      |             |                      |
| Save-intent sessions                         |       |             |      |             |                      |
| Prepared handoffs (`entity_saved`)           |       |             |      |             |                      |
| Failed handoffs (`generator_handoff_failed`) |       |             |      |             |                      |
| Copy / share sessions                        |       |             |      |             |                      |
| Errors / cancel                              |       |             |      |             |                      |

## Interpretation guidance

- Samples are small. Report the denominator and an interval, and avoid reading small differences as real.
- Make no causal claims. A before/after change can come from traffic mix, season or ranking.
- Do not compare raw totals across the `seo_entry` start date (2026-10-25).
- The baseline is not QA-excluded. Do not present it as verified human conversion.

## Privacy boundary

- No analytics in `import-handler.ts`, in-vault components, entity stores or OPFS.
- No user text, result content, vault titles or IDs in any event.
- Private vaults are never tracked. Nothing after the redirect into the app is observed.

## Follow-ups

- CTA impression and `placement` / `variant` on `save_to_codex` once #4624 / #4625 land.
- Add `generator_handoff_failed` to [ZARAZ_ANALYTICS.md](./ZARAZ_ANALYTICS.md) once job 063 merges.
- Build the charts and fill in the post-release table.
