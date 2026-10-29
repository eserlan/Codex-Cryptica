# Point-Crawl Acquisition Funnel Runbook (#4372 / #4386)

This runbook covers the Amplitude configuration, QA exclusions, Google Search Console cross-check, and two-week reporting procedure required to complete [#4372](https://github.com/eserlan/Codex-Cryptica/issues/4372) and [#4386](https://github.com/eserlan/Codex-Cryptica/issues/4386).

## Context & Code Status

The code side shipped in [#4382](https://github.com/eserlan/Codex-Cryptica/pull/4382) and has been live in production since **2026-10-25**:

- **Organic search classification** (`apps/web/src/lib/services/analytics/search-referral.ts` & `attribution.ts`): Marketing landings with an external search-engine referrer and no `utm_source` attach flat properties to in-session events:
  - `acquisition_channel = "organic_search"`
  - `acquisition_search_engine` ∈ `{ "google", "bing", "duckduckgo", "yahoo", "ecosia", "brave" }`
  - `acquisition_landing_path` (root-relative landing path)
- **Session boundary**: Those flat `acquisition_*` properties are scoped to the browser tab session that captured the landing. A later visit without a new search referral does not project them onto events, so always segment on in-session event properties rather than sticky user properties.
- **`seo_entry` step-change**: `seo_entry` fires for organic-search landings starting **2026-10-25**.
- **Privacy boundary**: Nothing after the redirect into the vault app is observed or tracked. `public_generator_action_clicked` (`action = "save_to_codex"`), `entity_saved`, and `vault_created` are **pre-import intent signals** only—never report them as confirmed vault persistence or retention.

See [ZARAZ_ANALYTICS.md](./ZARAZ_ANALYTICS.md) for the full event schema.

---

## Step 1: Exclude Crawler, QA, and Synthetic Traffic

Before reading any human counts in Amplitude:

1. Create a saved **Cohort / Segment** in Amplitude (e.g. `Human Visitors (Excl. QA & Bots)`) that excludes:
   - Internal QA UTM parameters (`utm_source` or `utm_medium` values used for testing/automation)
   - Known personal/test devices or User/Device IDs
   - Obvious headless browser / crawler user agents
2. Apply this segment to **every chart** on the dashboard below.
3. Add an **Amplitude release annotation on `2026-10-25`**:
   - _"PR #4382 deployed: `seo_entry` and `acquisition_channel = organic_search` enabled for organic search landings."_

---

## Step 2: Build the Two Saved Funnels in Amplitude

Configure both funnels with:

- **Count by**: Session / Device
- **Conversion window**: **24 hours** (within session)
- **Segment by**: Event property `acquisition_channel` (`organic_search`, `ai_referral`, `(none)` / unset)
  - _Important_: Always label `(none)` / unset as **Unattributed**, never as Google or Direct (browsers and privacy modes frequently strip `Referer`).
- **Filter**: Apply the QA / synthetic exclusion segment from Step 1.

### Funnel A: Point-Crawl Answer → Generator → Save (5 Steps)

| Step  | Event Name                        | Event Filters                                                                                                                                                         |
| :---- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | `discovery_page_viewed`           | `source_kind = "answer"` AND `source_id` ∈ `{ "what-is-a-point-crawl", "how-do-you-build-a-point-crawl-for-an-rpg", "point-crawl-vs-hex-crawl" }`                     |
| **2** | `discovery_click`                 | `target_kind = "generator"` AND `target_id = "point-crawl"` AND `source_kind = "answer"` (hold `source_id` constant where supported, or match the three Answer slugs) |
| **3** | `generator_started`               | `generator_type = "point-crawl"`                                                                                                                                      |
| **4** | `generator_completed`             | `generator_type = "point-crawl"`                                                                                                                                      |
| **5** | `public_generator_action_clicked` | `generator_type = "point-crawl"` AND `action = "save_to_codex"`                                                                                                       |

### Funnel B: Direct Point-Crawl Generator Entry (3 Steps)

Visitors landing directly on `/generators/point-crawl` skip Steps 1–2. Build a second funnel with the same segmentation:

| Step  | Event Name                        | Event Filters                                                   |
| :---- | :-------------------------------- | :-------------------------------------------------------------- |
| **1** | `generator_started`               | `generator_type = "point-crawl"`                                |
| **2** | `generator_completed`             | `generator_type = "point-crawl"`                                |
| **3** | `public_generator_action_clicked` | `generator_type = "point-crawl"` AND `action = "save_to_codex"` |

---

## Step 3: Supporting Series & Dashboard

Add two supporting charts so valid non-save utility and per-page CTA performance are visible alongside the funnels:

1. **Generator Post-Completion Actions (Event Segmentation)**:
   - **Event**: `public_generator_action_clicked` where `generator_type = "point-crawl"`
   - **Group by**: `action` (`copy`, `save_to_codex`, `open_codex`)
   - _Note_: `copy` represents valid product utility, not a failed save.
2. **Per-Answer CTA Effectiveness (Funnel or Event Segmentation)**:
   - **Steps**: Step 1 (`discovery_page_viewed`) → Step 2 (`discovery_click` where `target_kind = "generator"` and `target_id = "point-crawl"`)
   - **Group by**:
     1. `source_id` — compares the definition (`what-is-a-point-crawl`), how-to (`how-do-you-build-a-point-crawl-for-an-rpg`), and comparison (`point-crawl-vs-hex-crawl`) pages.
     2. `placement` — separates `section_cta`, `codex_connection`, `related_tool`, and `inline_link`.
3. **Save to One Amplitude Dashboard**:
   - Place Funnel A, Funnel B, Post-Completion Actions, and Per-Answer CTA Effectiveness on a single saved Amplitude dashboard.
   - Link the dashboard URL here, in [ZARAZ_ANALYTICS.md](./ZARAZ_ANALYTICS.md), and in [#4386](https://github.com/eserlan/Codex-Cryptica/issues/4386).
   - **Dashboard URL**: _(paste Amplitude link here once saved)_

---

## Step 4: Google Search Console Cross-Check & Two Weekly Windows

Record two comparable 7-day post-deploy windows after **2026-11-07**:

- **Week 1**: `2026-10-25` → `2026-10-31`
- **Week 2**: `2026-11-01` → `2026-11-07`

### Baseline Reference (24 Oct 2026, GSC Rolling 28 Days)

| Page                                                 | Impressions | Clicks |
| :--------------------------------------------------- | ----------: | -----: |
| `/generators/point-crawl`                            |          22 |      4 |
| `/answers/how-do-you-build-a-point-crawl-for-an-rpg` |          33 |      1 |
| `/answers/point-crawl-vs-hex-crawl`                  |          15 |      2 |
| `/answers/what-is-a-point-crawl`                     |           7 |      0 |

### Reporting Template (Copy into #4386 / #4372 after 2026-11-07)

```markdown
### Point-Crawl Funnel Report (Week 1 vs Week 2)

**QA / Synthetic Exclusion Applied:** Yes (`<cohort/segment name>`)
**Conversion Window:** 24h within session

#### 1. Answer → Generator → Save Funnel (Funnel A)

| Window                 | Channel (`acquisition_channel`) | 1. Answer Viewed | 2. Generator CTA Clicked | 3. Generator Started | 4. Generator Completed | 5. Save to Codex Intent | Copy Clicked |
| :--------------------- | :------------------------------ | ---------------: | -----------------------: | -------------------: | ---------------------: | ----------------------: | -----------: |
| **Week 1** (Oct 25–31) | `organic_search`                |                  |                          |                      |                        |                         |              |
| **Week 1** (Oct 25–31) | `ai_referral`                   |                  |                          |                      |                        |                         |              |
| **Week 1** (Oct 25–31) | Unattributed (`unset`)          |                  |                          |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | `organic_search`                |                  |                          |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | `ai_referral`                   |                  |                          |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | Unattributed (`unset`)          |                  |                          |                      |                        |                         |              |

#### 2. Direct Generator Funnel (Funnel B)

| Window                 | Channel (`acquisition_channel`) | 1. Generator Started | 2. Generator Completed | 3. Save to Codex Intent | Copy Clicked |
| :--------------------- | :------------------------------ | -------------------: | ---------------------: | ----------------------: | -----------: |
| **Week 1** (Oct 25–31) | `organic_search`                |                      |                        |                         |              |
| **Week 1** (Oct 25–31) | `ai_referral`                   |                      |                        |                         |              |
| **Week 1** (Oct 25–31) | Unattributed (`unset`)          |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | `organic_search`                |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | `ai_referral`                   |                      |                        |                         |              |
| **Week 2** (Nov 01–07) | Unattributed (`unset`)          |                      |                        |                         |              |

#### 3. Per-Answer CTA Breakdown (Weeks 1–2 Combined)

| Answer (`source_id`)                        | Views (`discovery_page_viewed`) | Generator Clicks (`discovery_click`) | Top `placement` |
| :------------------------------------------ | ------------------------------: | -----------------------------------: | :-------------- |
| `what-is-a-point-crawl`                     |                                 |                                      |                 |
| `how-do-you-build-a-point-crawl-for-an-rpg` |                                 |                                      |                 |
| `point-crawl-vs-hex-crawl`                  |                                 |                                      |                 |

#### 4. Google Search Console vs Amplitude `organic_search` (`google`) Cross-Check

_(Note: GSC clicks and Amplitude sessions/events are distinct units; comparing direction and rough scale only.)_

| Page                                                 | Week 1 GSC Impr / Clicks | Week 1 `google` Landings | Week 2 GSC Impr / Clicks | Week 2 `google` Landings |
| :--------------------------------------------------- | -----------------------: | -----------------------: | -----------------------: | -----------------------: |
| `/generators/point-crawl`                            |                          |                          |                          |                          |
| `/answers/how-do-you-build-a-point-crawl-for-an-rpg` |                          |                          |                          |                          |
| `/answers/point-crawl-vs-hex-crawl`                  |                          |                          |                          |                          |
| `/answers/what-is-a-point-crawl`                     |                          |                          |                          |                          |

_Caveats: `save_to_codex` / `entity_saved` counts represent pre-import outbound click intent, not confirmed vault persistence. Unset `acquisition_channel` sessions are reported as unattributed. No causal claim is made regarding #4369 / #4371._
```
