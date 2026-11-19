# Solo Adventure Mode: Manual QA Test Script

Step-by-step tester script for manually verifying Solo Adventure Mode (AI GM) and Imported Adventure JSON (`adventure-json/v1`). See [adventure-evaluation-protocol.md](./adventure-evaluation-protocol.md) for the release rubric, stop-ship gates, and live-model baseline recording tables.

---

## Pre-flight

1. **Open the staging app** in a desktop browser (`>= 1280px` viewport), create a **disposable Vault**, and import `fixtures/adventures/qa-staging-campaign.cif.json` via **Import** (this seeds **Mara**, **Brackwater Quay** with GM-only `lore`, **Harbourmaster Venn** linked to Brackwater Quay, **Old Bell Tower** with GM-only `lore`, a future-dated entity `2125`, and a historical entity `1020` in one step).
2. **Have ready**:
   - `fixtures/adventures/reference-one-shot/adventure.v1.json`
   - A second copy of that file edited with `"version": "1.1.0"` and a changed `"description"` (keep the same `"id"`).
   - Desktop (`>= 1280px`) and Mobile (`390x844` and `320x844`) viewports.

---

## TC-1: Ready-Made Start & Existing-World Grounding

1. Open **Play → Oracle AI GM** (`AdventureSurface`).
2. Start a **Ready-made** adventure anchored to **Mara** and **Brackwater Quay**.
   - **Pass if:** Opening narration uses Brackwater Quay's public details and does **not** mention any GM-only `lore` or future-dated entity facts.
3. Submit 3 ordinary, non-heroic actions (e.g., _"Ask locals about the boats"_, _"Buy bread at the quay"_, _"Watch the tide"_).
   - **Pass if:** No forced quest objectives or sudden combat appear, the AI does not narrate Mara's decisions/thoughts/speech for you, and `worldTime` advances monotonically.

---

## TC-2: World Entry (`explore`) & Living Settlement

1. Start a **World Entry (`explore`)** adventure at **Brackwater Quay**.
2. Advance turns / trigger rumour seeding, then open the **Leads / Situations** panel.
   - **Pass if:** Heard leads appear; unheard rumours, GM-only truths, and `timeAdvance.developments` are **not** visible in player panels or recap.
3. Follow one lead, ignore a second lead while advancing time, travel to **Old Bell Tower**, then return to **Brackwater Quay**.
4. Reload the page, then archive and resume the session.
   - **Pass if:** Places and people keep stable identities across travel, reload, and archive/resume.

---

## TC-3: Provisional Discoveries & Selective Promotion

1. Play until the GM introduces at least 2 new provisional facts (`person`, `place`, `faction`, `item`, or `event`).
2. Open the **Discoveries / Provisional Facts** review drawer.
   - **Pass if:** GM-only facts never appear in promotion drafts.
3. **Promote** one discovery to the Vault and **Dismiss** another.
   - **Pass if:** The promoted fact links to a single Vault entity (without duplicating canonical titles), and the dismissed fact stays in session continuity without creating a Vault entity.

---

## TC-4: Roll Required, Reload Persistence & Error Secrecy

1. Take a risky action to trigger a **Roll Required** turn.
2. Record a roll outcome, then **reload the page before resolving**.
   - **Pass if:** The pending roll and recorded outcome survive reload without rerolling dice.
3. Open **Recap** and **Transcript**, then toggle browser **Offline** and submit an action to trigger an error banner.
   - **Pass if:** Zero GM secrets, canary strings, or raw storage error details appear in Recap, Transcript, or the error banner.

---

## TC-5: Imported Adventure JSON (`adventure-json/v1`) End-to-End

1. On **Play → Oracle AI GM**, open **Import Adventure JSON** and upload `fixtures/adventures/reference-one-shot/adventure.v1.json`.
   - **Pass if:** Validates locally with zero AI calls; review shows title, scene counts, and `GM-only (locked)` markers.
2. Click **Approve**, then close review and inspect the **Approved packages** list.
   - **Pass if:** Package appears in the list with zero `gm-only` secrets, clues, or hidden notes visible.
3. Re-upload the **exact same** `adventure.v1.json`.
   - **Pass if:** Recognised as already imported (deduplicated; no review dialog, no duplicate card).
4. Upload your edited **`1.1.0`** JSON file.
   - **Pass if:** Review opens showing the diff against `1.0.0`. Approve it so both versions exist, then remove the unused `1.1.0` version.
5. _(Optional)_ Click **Create Creatures** on the approved package, review the preview, and confirm.
   - **Pass if:** Created Creature entries match the preview, never overwrite existing Vault entries, and keep encounter links GM-only.
6. Click **Start** on the approved `1.0.0` package, pick a starting scene (if shown), enter **Mara** / description, and click **Start adventure**.
   - **Pass if:** Session starts cleanly (no `invalid-adventure-setup` / `DataCloneError`) on the chosen starting scene.
7. Play 3+ turns including moving to a new scene, open **Adventure tools → Package progress**, then **reload the page** and check **Adventure tools → Package progress**, **Recap**, **Transcript**, and **Guest Export**.
   - **Pass if:** Scene progress survives reload; `Package progress` hides `gm-only` secrets/notes unless the GM audit disclosure is explicitly opened; zero `gm-only` text or internal ledger IDs leak into narration, recap, transcript, or guest export.

---

## TC-6: Mobile Viewport Smoke (`390x844` and `320x844`)

1. Resize browser DevTools to `390x844` (and repeat layout check at `320x844`).
2. On `/adventure`, check the **Import Adventure JSON** dropzone, start a session, submit an action, record a roll outcome, and open the discoveries drawer.
   - **Pass if:** Dropzone copy wraps cleanly above a full-width upload CTA, and all controls/modals are reachable with zero horizontal overflow or clipping.

---

## Sign-off

Record **Pass / Fail / Blocked** plus provider/model, turn count, latency, and any failures in the **Record the run** and **Live-Model Baseline** tables in [adventure-evaluation-protocol.md](./adventure-evaluation-protocol.md).
