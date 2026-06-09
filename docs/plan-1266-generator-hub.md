# Plan: Generator Hub — UX & Quality Improvements (#1266)

God-file split is done. This plan covers what's left.

---

## 1. Campaign context + variance seed — settlement & magic-item

**Status:** gap  
**Files:** `generators/settlement.ts`, `generators/magic-item.ts`, `[slug]/+page.svelte`

Both generators are missing `campaignContext` and `varianceSeed`. Every other generator has them.

**Work:**

- Add `campaignContext?: string` to each generator's options type
- Generate `varianceSeed = Math.floor(Math.random() * 99991) + 10` at the top of each function
- Inject both into the AI prompt (same pattern as `npc.ts` / `faction.ts`)
- Extend the fallback text to use `campaignContext` where natural (see the inline pattern in `kingdom-nation.ts:320`)
- Add `campaignContext` state + a form field in `[slug]/+page.svelte` for both slugs (inline, no new component needed — settlement and magic-item forms are still inline in the page)

**Also:** `quest.ts` has `campaignContext` but no `varianceSeed` — add the seed and inject it into the AI prompt (one-liner, see `npc.ts:463–510` for pattern).

---

## 2. Fallback quality — settlement & magic-item

**Status:** noticeably weak  
**Files:** `generators/settlement.ts`, `generators/magic-item.ts`

Current fallback prose is boilerplate ("sturdy foundations tailored to the environment", "slightly warm or cool to the touch depending on the active wielder's alignment"). Needs richer static tables to generate something a GM could actually use.

**Settlement — add to `settlementConfig`:**

- `atmospheres`: 8–10 entries (e.g. "The air reeks of tanneries and canal water", "Smoke from the smelters hangs low over the rooftops")
- `rumors`: 8 entries (short, hook-shaped)
- `notableNPCs`: 8 name+role pairs (e.g. "Aldric Vane, the fence who controls the dockside black market")
- Rewrite fallback `content` to pick from `atmospheres` and add a rumor
- Rewrite fallback `lore` to include a notable NPC and a rumor hook

**Magic item — add to `magicItemConfig`:**

- `materials`: 8 entries (e.g. "cold iron wound with silver wire", "bone inlaid with glowing amber resin")
- `quirks`: 8 entries (minor personality/behaviour, distinct from `properties`)
- `curses`: 6 entries (optional GM toggle)
- Rewrite fallback `content` to pick a material and describe it concretely
- Rewrite fallback `lore` to include a quirk and optionally a curse

---

## 3. Cross-generator consistency

**Status:** minor drift  
**Files:** all `generators/*.ts`

A quick audit of section headers across fallback `lore` blocks:

| Generator      | GM section header              |
| -------------- | ------------------------------ |
| npc            | `### GM Notes`                 |
| faction        | `### GM Reference Information` |
| settlement     | `### GM Reference Information` |
| magic-item     | `### GM Reference Information` |
| quest          | `### GM Reference Information` |
| kingdom-nation | `### GM Reference Information` |
| social-hub     | `### GM Reference Information` |

NPC uses `### GM Notes` — rename to `### GM Reference Information` to match the rest.

Also audit label conventions — some generators use `imported-draft`, check all are consistent.

---

## 4. UI/UX — form layout & result presentation

**Status:** functional but unpolished  
**File:** `[slug]/+page.svelte` (211 lines), form field components in `src/lib/components/seo/`

Low-hanging items:

- Settlement and magic-item forms are still inline in the page while all other generators have extracted `*FormFields.svelte` components — extract them for consistency
- Once campaign context fields are added (item 1), ensure the field ordering is consistent across all forms: generator-specific options first, campaign context last
- Result section: confirm `content` and `lore` blocks render with consistent heading levels across all generators (spot-check in browser)

Bigger items (lower priority, may warrant their own PR):

- Option grouping: some forms have many dropdowns with no visual grouping — consider a light `<fieldset>` or label-group separation
- Result copy UX: the current copy/import flow — validate it works correctly after the refactor

---

## Suggested order

1. `settlement` + `magic-item` campaign context & seed (item 1) — small, safe, closes the consistency gap
2. Quest variance seed (item 1, one-liner)
3. Fallback quality pass for settlement + magic-item (item 2) — pure data, no logic risk
4. NPC header rename + label audit (item 3) — tiny
5. Extract `SettlementFormFields` + `MagicItemFormFields` (item 4) — prep for future form additions
6. Remaining UI/UX polish (item 4) — last, most subjective

Items 1–4 can ship as a single PR. Item 5–6 are a follow-up.
