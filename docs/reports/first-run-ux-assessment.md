# Codex Cryptica — First-Run UX Assessment (Newcomer / First-Time User)

**Scope:** How easily a brand-new, first-time user can get started and understand what Codex Cryptica (CC) does — on **desktop, tablet, and phone**.
**Method:** Code-level walkthrough of the real first-run paths (routes, onboarding store, tour engine, activity bar, header, mobile menu, demo service, help content). This is a heuristic + code-evidence review, **not** a moderated usability test — so treat severities as informed hypotheses to validate, and the two "Bug" findings as verifiable defects.
**Date:** 2026-07-23 · **Branch reviewed:** `main`

> **STATUS (2026-07-23): IMPLEMENTED.** Everything below was written _before_ the fixes and is preserved as the point-in-time assessment. Epic [#1777](https://github.com/eserlan/Codex-Cryptica/issues/1777) and all 10 sub-issues were implemented in [PR #1788](https://github.com/eserlan/Codex-Cryptica/pull/1788) (merged to `staging` the same day) and manually verified on desktop, phone, and tablet viewports. See **[Outcome & recommended next steps](#outcome--recommended-next-steps)** at the end for what was fixed, what additional bugs the manual QA pass surfaced, and what to do next.

---

## TL;DR

CC's biggest onboarding _asset_ is real and rare: **no account, no setup, instant themed demo worlds, everything local-first.** A newcomer can be looking at a populated fantasy world in one click. That's excellent.

The problem is everything _around_ that moment:

1. **The guided tour is partly broken** — 3 of its 11 steps point at DOM selectors that no longer exist, and the whole tour is desktop-only (it spotlights elements that are `hidden` on phones). New users on mobile get floating, unanchored tooltips.
2. **Onboarding is "feature tourism," not a task.** An 11-step tour + a 133-line intro doc enumerate everything the app can do _before the user has created a single thing._
3. **Multiple first-run surfaces compete** — welcome/marketing layer, front-page overlay, tour, changelog modal, and theme prompt can each fire in the first session.
4. **The "learn it" path and the "see it" path are mutually exclusive** — starting the demo actively suppresses the tour, so users typically get one or the other by accident, not by design.
5. **No tablet treatment** — a single 768px mobile/desktop split leaves iPad-portrait users with a cramped desktop layout and no touch coaching.

None of this requires a rewrite. The highest-impact fixes are small (fix selectors, make the tour skip missing targets, cut the tour to one task).

---

## The current first-run journey

### Desktop (the "happy path")

1. Land on `/` → **Welcome / marketing layer** renders over the app shell (`(app)/+page.svelte:324`). It presents, in one view: a hero, an interactive "Living Lore Graph" preview button, a primary **"Explore Demo Vault"** CTA, secondary **Create New Vault** / **Open Existing Vault**, an 8-chip **"Try a themed vault"** row, three product-highlight cards, four marketing links, and a **"Hide welcome screen on startup"** checkbox.
2. Most users click the dominant CTA → `demoService.startDemo("fantasy")` → dropped into a **populated sample world in demo mode** (`services/demo.ts:11`). Good moment. ✅
3. Because demo mode is active, the **onboarding tour is explicitly suppressed** (`(app)/+layout.svelte:363-366`). The user learns by poking around, with a "Save as vault" banner to convert.
4. If instead the user lands in a real, **empty** vault (e.g. they created one), an effect auto-starts a fantasy demo when `entities.length === 0` (`+layout.svelte:367-373`) — _replacing_ the empty-vault context rather than guiding them to create their first entity.
5. The 11-step spotlight tour only runs in the narrow case of a non-empty, non-demo vault that hasn't seen the tour (`+layout.svelte:354-378`).

### Phone (<768px)

- Header collapses: search becomes an icon button, the vault controls / settings move into a **hamburger `MobileMenu`**, and the ActivityBar becomes a **bottom bar** (`ActivityBar.svelte:131-134`).
- The bottom bar can pack up to **~9 icon targets** (5 views + Entities/Oracle/Notes/Chat) into a 56px-tall strip.
- **The tour targets desktop-only chrome** (see Finding 2), so a phone user who triggers it gets unanchored tooltips.
- There is a dedicated `MobileCreateEntitySheet` and a `dismissedMobileGraphCoachMarks` flag (`stores/ui/onboarding.svelte.ts:17`) — so _some_ mobile-specific care exists, but it isn't wired into a coherent first-run flow.

### Tablet (768–1280px)

- `isMobile` is a single media query `(max-width: 768px)` (`stores/ui/layout-ui.svelte.ts:243`). Everything above 768px gets the **desktop** layout.
- iPad portrait (~810–834 CSS px) therefore renders the vertical activity rail + inline header search + the full desktop right-cluster crammed into ~800px, with **no tablet-specific layout and no touch coaching** on the physics graph or VTT.

---

## Findings

| #   | Severity | Type            | Finding                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------ |
| 1   | **High** | Bug             | Tour spotlight broken for `graph`/`map`/`canvas` steps (stale selectors) |
| 2   | **High** | Bug/UX          | Tour is desktop-only; targets `hidden` elements on phone                 |
| 3   | **High** | UX              | 11-step tour + 133-line intro = feature tourism before first action      |
| 4   | Medium   | UX              | Multiple first-run overlays compete for the first session                |
| 5   | Medium   | UX              | "See the demo" and "learn via tour" are mutually exclusive tracks        |
| 6   | Medium   | Content         | Jargon-forward copy raises the cost of the first 60 seconds              |
| 7   | Medium   | Responsive      | Binary 768px split; no tablet layout or touch onboarding                 |
| 8   | Medium   | UX              | Empty new vault auto-starts a demo instead of guiding a first entity     |
| 9   | Low      | Discoverability | No durable "Getting started" affordance once welcome is hidden           |

### Finding 1 — Tour spotlight is broken for 3 core steps _(High, verifiable bug)_

`ONBOARDING_TOUR` steps target:

- `[data-testid="nav-graph"]` (`config/help-content.ts:55`)
- `[data-testid="nav-map"]` (`:63`)
- `[data-testid="nav-canvas"]` (`:71`)

But `ActivityBar.svelte` renders these as **`activity-bar-graph` / `activity-bar-map` / `activity-bar-canvas`** (dynamic testid, `ActivityBar.svelte:148`). A repo-wide search for `nav-graph|nav-map|nav-canvas` returns **zero** matches outside the tour config. When the selector misses, `targetRect` is `null`, so `TourOverlay` renders **no spotlight mask** (`TourOverlay.svelte:109`) and the tooltip floats unanchored. → 3 of 11 tour steps highlight nothing. This looks like fallout from an ActivityBar refactor that renamed the testids without updating the tour.

**Fix:** rename the three selectors to `activity-bar-*`, and add a guard in `TourOverlay`/`help.svelte` to **auto-skip a step whose target isn't in the DOM** rather than show a floating tooltip.

### Finding 2 — The tour is desktop-only _(High)_

Several tour targets are desktop-only and simply don't exist on phones:

- `search-input` → `hidden md:block` (`AppHeader.svelte:116`)
- `settings-button` → inside `hidden md:flex` right cluster (`AppHeader.svelte:144,191`)
- `open-vault-button` / `import-vault-button` → `VaultControls`, rendered only in the desktop right cluster.

On <768px these nodes aren't in the DOM, so (per Finding 1's mechanism) their steps spotlight nothing. The **mobile equivalents** (bottom `ActivityBar`, `MobileMenu` trigger, mobile search button) are never referenced by the tour. Net: the guided tour is effectively non-functional on phone, and partially so on tablet where the right-cluster is cramped.

**Fix:** either a short **mobile-specific tour** using real mobile targets, or make the single tour **layout-agnostic** (target elements present in both layouts, and skip absent ones).

### Finding 3 — Feature tourism instead of a first task _(High)_

The first-run tour enumerates 11 surfaces (graph, map, canvas, search, oracle, explorer, dice, importer, settings…) **before the user creates anything.** In parallel, `content/help/intro.md` is 133 lines across ~8 dense sections. New users are asked to _read the manual_, not _do one thing_. The intro doc actually contains the ideal first task — **"Your First 5 Minutes"**: create `Eldrin` → write `A legendary mage living in [[Kingdom of Aethel]]` → the link auto-creates → open the graph and see the edge (`intro.md:16-25`). That single loop _is_ the product's magic. It should be the onboarding, not a buried checklist.

**Fix:** cut the first-run tour to **≤4 steps built around that one loop** (create → link → open graph → "you did it"). Move the exhaustive feature list to an optional "What else can CC do?" gallery in Help.

### Finding 4 — Competing first-run overlays _(Medium)_

In a first session, these can each independently trigger: the welcome/marketing layer (`+page.svelte:324`), the **front-page overlay** (`+page.svelte:277`), the **spotlight tour** (`+layout.svelte:354`), the **changelog modal** (`+layout.svelte:381`), and the **vault-theme prompt** (`+layout.svelte:421`). There's careful guarding between some of them, but no single orchestrator guaranteeing a first-timer sees **exactly one** coherent path.

**Fix:** a small onboarding orchestrator/state machine that owns "what does a first-time user see first," so these surfaces queue rather than compete.

### Finding 5 — "See it" vs "learn it" are mutually exclusive _(Medium)_

The dominant welcome CTA starts **demo mode**, and demo mode **suppresses the tour** (`+layout.svelte:363-366`). The empty-vault effect also starts a demo _instead of_ the tour (`:367-373`). So whether a user ever sees the guided tour is largely accidental. The demo (see a rich world) and the tour (learn to build one) should be **complementary steps**, not forks.

**Fix:** after the demo "wow," offer an explicit next step — _"Now make your own → 3 quick steps"_ — that launches the trimmed guided flow in a real vault.

### Finding 6 — Jargon-forward copy _(Medium)_

First-run language leads with domain/flavor jargon: _Vault, Entity, Chronicle, Lore, Oracle, Codex Interchange Format (CIF), Origin Private File System (OPFS), Fog of War, Anchor (intercalary festival days)_. The intro opens with _"absolute sovereignty over your lore"_ and _"Origin Private File System (OPFS)"_ (`intro.md:12,33`). Evocative and good for SEO/brand — but heavy for someone who just wants to make an NPC. A `resolveJargon` system already exists (used e.g. `+page.svelte:263`), and a `FeatureHint` system exists for contextual tips (`config/help-content.ts:127`).

**Fix:** plain-language first-run copy ("your world," "a character or place," "notes stay on your device"), and introduce the flavor terms **contextually** via `FeatureHint` the first time each surface is used.

### Finding 7 — No tablet treatment / touch onboarding _(Medium)_

Single `max-width: 768px` mobile split (`layout-ui.svelte.ts:243`) means tablets get desktop layout. The knowledge graph is a physics sim and the VTT is touch-heavy; the only touch coaching is a phone-oriented `dismissedMobileGraphCoachMarks` flag (`onboarding.svelte.ts:17,98`). A first-time tablet user gets a cramped desktop UI and no pan/zoom guidance.

**Fix:** add a tablet-aware breakpoint (or fluid header reflow ~800px), enlarge bottom-bar tap targets, and extend graph/VTT coach marks to first touch interaction on tablet, not just phone.

### Finding 8 — Empty new vault auto-starts a demo _(Medium)_

When a user deliberately creates a **new, empty** vault, the auto-effect starts a fantasy demo because `entities.length === 0` (`+layout.svelte:367-373`) rather than helping them create their _first own entity_. `EmptyState.svelte` already supports `cta`/`secondaryCta` — the scaffolding for a guided empty state exists but isn't used as a first-entity flow on the empty graph.

**Fix:** on an empty **user** vault (not demo), show an inline first-run checklist in the empty graph (reusing `EmptyState`) that ticks off create → link → open-graph, instead of silently swapping in a demo.

### Finding 9 — No durable "Getting started" affordance _(Low)_

Once **"Hide welcome screen on startup"** is checked (`+page.svelte:529`), the welcome no longer appears, and Help lives inside Settings / the mobile menu. There's no always-visible, low-friction "New here? Start here" entry point in the workspace.

**Fix:** a small, dismissible "Getting started" card/affordance in the empty workspace and mobile menu that survives the hide-welcome toggle.

---

## What's already good (keep it)

- **Instant, account-free, local-first demo** across 8 themed genres — a genuinely strong first impression (`+page.svelte:41-50`, `services/demo.ts`).
- **Interactive graph preview** on the welcome screen lets users _see_ the core concept before committing (`WelcomeGraphPreview`).
- **Accessibility care**: aria labels throughout, background `inert` when modals open (`+layout.svelte:547-561`), keyboard tour nav (←/→/Esc, `TourOverlay.svelte:47-57`), focus-visible rings.
- **Thorough help content** and a `FeatureHint` system — the raw material for contextual onboarding already exists.
- **Mobile-aware primitives** already present (`MobileCreateEntitySheet`, `MobileMenu`, coach-mark flag) — they just need to be wired into a coherent flow.

---

## Recommendations (prioritized)

### Quick wins — bugs & low effort, high impact

1. **Fix the 3 stale tour selectors** (`nav-graph/map/canvas` → `activity-bar-graph/map/canvas`) in `config/help-content.ts`.
2. **Make `TourOverlay` resilient**: if a step's target isn't in the DOM, auto-advance/skip instead of showing an unanchored tooltip (`TourOverlay.svelte` / `help.svelte`).
3. **Cut the first-run tour to ≤4 task-focused steps** (create → link → open graph → done). Park the full feature list in an optional Help gallery.

### Medium — restructure the first session

4. **One orchestrated first-run path.** Introduce an onboarding orchestrator so welcome, front-page overlay, tour, changelog, and theme prompt queue rather than compete (Finding 4).
5. **Chain demo → guided build.** After the demo, offer an explicit "Make your own world (3 steps)" that launches the trimmed guided flow in a real vault (Findings 5, 8).
6. **Real guided empty state.** On an empty _user_ vault, show an inline create-your-first-entity checklist via `EmptyState` instead of auto-loading a demo (Finding 8).
7. **Plain-language first-run copy**, with flavor terms (Vault/Chronicle/Lore) introduced contextually through `FeatureHint` (Finding 6).

### Responsive — tablet & touch

8. **Make the tour layout-agnostic or add a mobile tour** targeting real mobile elements (Finding 2).
9. **Add tablet handling**: a tablet breakpoint or fluid header reflow ~800px, larger bottom-bar tap targets, and graph/VTT touch coach marks on tablet, not just phone (Finding 7).

### Cross-cutting

10. **Instrument the onboarding funnel** (welcome shown → demo started → vault created → first entity → first link → graph opened) so these changes can be validated with data rather than intuition.

---

## Suggested definition of "getting started works"

A first-time user, on **any** of desktop / tablet / phone, can within ~2 minutes:

1. See a populated world (demo) **or** be guided to create their own — as an intentional choice, not an accident.
2. Create one character, link it to one place, and see the connection appear in the graph — the core loop, guided end-to-end.
3. Do all of the above without hitting a tour tooltip that points at nothing, and without reading a 133-line manual first.

Findings 1–3 block criterion 3 today; Findings 5 & 8 block criterion 1; Finding 2 blocks all three on phone.

---

## Outcome & recommended next steps

_Added 2026-07-23, after [PR #1788](https://github.com/eserlan/Codex-Cryptica/pull/1788) merged. Everything above is the original pre-fix assessment._

### What was implemented (PR #1788, epic #1777)

| Finding                     | Issue | Resolution                                                                                                               |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 — stale tour selectors    | #1787 | Retargeted to `activity-bar-*`; tour rewritten around them                                                               |
| 2 — tour desktop-only       | #1784 | Tour is layout-agnostic; `pruneStepsToDom()` skips absent targets instead of floating                                    |
| 3 — feature tourism         | #1779 | Tour trimmed 11 → 4 task-focused steps (create → link → graph → optional AI + Help pointer)                              |
| 4 — competing overlays      | #1780 | Pure `decideFirstRunAction()` orchestrator owns the first-run path; changelog/tour/theme-prompt sequenced, never stacked |
| 5 — demo vs. tour fork      | #1781 | Demo convert ("MAKE THIS MINE") now chains into the guided tour                                                          |
| 6 — jargon-forward copy     | #1783 | Plain-language tour/empty-state/intro; jargon introduced in context                                                      |
| 7 — no tablet treatment     | #1785 | `isTablet`/`isTouch` breakpoints, 44px mobile tap targets, header search collapses below `lg`                            |
| 8 — empty-vault demo hijack | #1782 | Empty user vaults get the guided empty state + tour, never a silent demo swap                                            |
| 9 — no durable "start here" | —     | **Not implemented** (Low severity — see next steps)                                                                      |
| 10 — funnel instrumentation | #1786 | `OnboardingFunnel` records the 6 milestones (once each, persisted, privacy-respecting)                                   |

### What manual QA surfaced beyond the assessment

The post-merge manual pass (desktop → phone → tablet) found and fixed five things this code-level review missed — worth remembering as classes of bug a static read-through under-detects:

1. **`GuideTooltip` positioning was latently broken** in two ways: the safety clamp operated on pre-`transform` coordinates (so `translateY(-50%)` targets near an edge still rendered off-screen), and it trusted a fixed 200px height guess that longer step copy legitimately exceeds on narrow viewports. Now measures its real rendered size and picks whichever side genuinely has room.
2. **Tour step 1 pointed at the wrong mental model** — the Explorer button opens a sidebar with no persistent create action; creation lives elsewhere per layout. Retargeted to the graph empty-state CTA, which only exists exactly when the instruction applies (and prunes away otherwise).
3. **Copy overstated auto-linking.** Mentioning a name _proposes_ a connection (explicit "Apply Connection" in `DetailProposals.svelte`); it does not silently create an edge. Two spots reworded.
4. **The mobile graph coach marks were a second, un-orchestrated onboarding system** — they could render simultaneously with the main tour, and one card literally covered the FAB it described. Now sequenced after the tour, spotlight their real targets via a shared `spotlight.ts` util, and are correctly scoped to `isMobile` only (their copy describes mobile-only chrome; tablets get the desktop rail/toolbar).
5. **An unrelated release-blocking bug** (`snapshotValue` reflecting through `globalThis.$state` → `rune_outside_svelte` → demo load crash) — found only because a human clicked the demo button.

### Recommended next steps (prioritized)

1. **Selector-drift contract test** _(top pick — cheap, closes the root cause)_. Finding 1 existed because a refactor renamed testids and nothing noticed the tour pointed at ghosts. A unit test asserting every `targetSelector` in `ONBOARDING_TOUR` and `COACH_MARKS` matches a `data-testid` present in the source tree makes that bug class unrepresentable.
2. **Fix the dangling `<FeatureHint hintId="graph-controls" />`** in `GraphView.svelte` — it references a hint absent from `FEATURE_HINTS` and silently renders nothing. Register it or remove it.
3. **Close the funnel loop** (follow-up to #1786). The tracker emits milestones but nothing consumes them — `dataLayer`/`__codexAnalytics` are speculative hooks. Without a consumer, before/after completion rates can't actually be compared, which was the point. Smallest useful step: a dev-mode debug readout; real step: a lightweight collection event on the oracle-proxy worker.
4. **Finding 9 — durable "Getting started" affordance** (the one unimplemented finding). A "Replay tour" entry in Help plus a small dismissible starter card would stop onboarding being a one-shot; today, replaying requires clearing localStorage, which users can't discover.
5. **E2E of the first-run path** — Playwright: clear storage, load at desktop + mobile viewports, walk the tour. Strongest regression net; overlaps heavily with (1), so do (1) first and add this when e2e budget allows.
6. **A genuinely layout-agnostic touch hint** ("drag to pan, pinch to zoom") on tablets — `prefersTouchCoaching` infrastructure is built, tested, and currently unused after the coach marks were correctly re-scoped to phones.

### Process note

The five manual-QA findings above argue that the "getting started works" definition should be verified _by walking the flow on each device class_, not only by code review — the assessment caught the structural problems, but every positioning/overlap/copy-accuracy bug required actually looking at the screen.
