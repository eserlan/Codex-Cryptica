# Issue #1494 — Better and richer generators in offline mode

> Plan + task checklist. Tick boxes as work lands.
> Two independent workstreams: **offline UX** and **offline output quality**.

## Architecture findings (context for the tasks)

- AI-failure fallback **already works at the data layer** — every method in
  `apps/web/src/lib/services/seo/generator-engine.ts` wraps the AI call in
  `try/catch` and silently returns `generateLocal(...)`. What's missing is
  _telling the user_ it fell back.
- Local generators **already use anchor-first, theme-keyed tables**
  (`generateNpcLocal` resolves `theme`/`role`/`moralityAnchor` first, then keys
  `secretsByTheme` etc.). Quality work is **expansion + seeded variation**, not a
  rewrite.
- `varianceSeed` exists but **only feeds AI prompts**, never local output. Local
  variation today comes purely from `Math.random()` via `defaultRng`.
- **No `navigator.onLine` awareness** in `SEOGeneratorLayout.svelte` yet — but
  the app uses it elsewhere (DriveStatus, P2PStatus, client-manager) to copy.
- Output plumbing: `PublicGeneratorOutput` (`public-generator-adapters.ts:17`)
  → mapped to SEO `GeneratorOutput` via `toSeoOutput` (`generator-engine.ts:85`).
  Surfacing the fallback notice needs one optional field on both types.

Decisions locked in:

- Fallback message = **inline dismissible notice above the draft** (exact issue copy).

---

## Phase 1 — Offline UX (ship first, one PR)

### Enabling plumbing

- [x] Add `aiFallback?: boolean` to `PublicGeneratorOutput`
      (`packages/generator-engine/src/public-generator-adapters.ts:17`)
- [x] Add `aiFallback?: boolean` to SEO `GeneratorOutput`
      (`apps/web/src/lib/services/seo/generator-helpers.ts:437`)
- [x] Carry `aiFallback` through `toSeoOutput` (`generator-engine.ts:85`) — spread carries it
- [x] Extract `runWithAIFallback(aiAttempt, localFn)` helper replacing the 12
      duplicate try/catch blocks; centralises the flag logic
- [x] Stamp `aiFallback: true` on the local output **only when `useAI !== false`**
      (AI was attempted and failed)

### `SEOGeneratorLayout.svelte`

- [x] Add `isOnline` state seeded from `navigator.onLine`
- [x] Wire `window` `online`/`offline` events in a `browser`-guarded `$effect`
      with teardown cleanup (mirror DriveStatus/P2PStatus)
- [x] Derive `effectiveUseAI = isOnline && useAI`
- [x] Pass `{ useAI: effectiveUseAI }` from `handleGenerate`
- [x] AI toggle: `disabled={!isOnline}`
- [x] Offline hint copy: _"Offline: using fast local tables. Reconnect to enable
      AI Lore Co-Author mode."_
- [x] **Local Mode banner** in params column when `!isOnline` (exact issue copy)
- [x] **Inline AI-fallback notice** above result card when `generatedData?.aiFallback`:
      _"AI generation was unavailable, so Codex created a local draft instead."_
      (dismissible; reset dismissed state on each new generate)
- [x] Offline path never reaches raw `errorMessage` — engine swallows AI errors
      and returns a local draft, so `handleGenerate` never throws on AI failure

### Phase 1 verification

- [x] Engine unit tests: aiFallback set on AI failure, unset on success/local-only
- [x] `bun run check` (svelte-check) — 0 errors; lint clean on web + generator-engine
- [ ] Manual DevTools → Offline smoke test (toggle disables, banner shows, gen works)

---

## Phase 2 — Local quality, core 3 (NPC, faction, settlement) — separate PR

### Shared

- [ ] Add a seeded RNG helper (mulberry32-style) to a shared location;
      reuse the existing `Rng = () => number` contract

### Per generator (`public-npc.ts`, `public-faction.ts`, `public-settlement.ts`)

- [ ] **NPC**: thread seed into `generateNpcLocal`; expand tables
      (mannerism, immediate problem, social leverage, visual tell);
      one optional twist; rotating section order; tests
- [ ] **Faction**: seed into local; expand tables
      (public face vs real agenda, internal schism, rival, pressure point,
      named representative); anchors constrain picks; twist + rotation; tests
- [ ] **Settlement**: seed into local; expand tables
      (atmosphere, landmark, power centre, rumour, recurring problem,
      sensory detail); twist + rotation; tests

### Per-generator test bar

- [ ] Required sections present and non-empty
- [ ] Fixed seed → stable output; different seeds → divergent output
- [ ] No anchor contradictions (e.g. tiny village w/ imperial institutions)

---

## Phase 3 — Remaining generators (incremental PRs, 2–3 per PR)

- [ ] Vampire clan (`public-faction.ts` / vampire path)
- [ ] Social hub (`public-social-hub.ts`)
- [ ] Tavern (`public-social-hub.ts`)
- [ ] Quest (`public-quest.ts`)
- [ ] Magic item (`public-magic-item.ts`)
- [ ] Kingdom (`public-kingdom.ts`)
- [ ] Nation (`public-nation.ts`)
- [ ] Pantheon / deity (`public-pantheon.ts`)
- [ ] Names (`public-names.ts`) — lighter: usage notes / cultural flavour

---

## Acceptance criteria (from issue)

- [ ] Generator pages still load and generate drafts while offline
- [ ] AI mode cannot be selected while offline
- [ ] Clear Local Mode explanation shown
- [ ] Copy, Save to Codex, Link to Hub work for local drafts
- [ ] AI failure gracefully falls back to local with friendly message
- [ ] No raw technical error for ordinary offline/API failures
- [ ] Offline results visibly richer than current placeholders
- [ ] Repeated offline generations show meaningful variation
- [ ] Offline results internally consistent with selected inputs
- [ ] Each local result includes ≥1 table-usable hook/tension/complication

## Risks / watch-items

- `aiFallback` touches the package's public output type — check
  `generator-engine.test.ts` snapshots tolerate an extra optional key.
- `effectiveUseAI` must not break on-mount draft (`handleGenerateOnMount`
  already forces `useAI: false`, so unaffected).
- Respect non-goals: no service-worker/PWA rewrite, no full rules engine —
  keep it table-driven.

## Non-goals (do not do)

- Make AI generation work offline
- Broader PWA/service-worker rewrite
- Full rules engine for local generation
