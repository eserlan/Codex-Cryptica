# Layout Refactoring Analysis: `+layout.svelte`

**Date:** 2026-03-22  
**Status:** Implementation in Progress  
**Branch:** `refactor/layout-god-component`

---

# Full Analysis

## Table of Contents

1. [File Inventory](#1-file-inventory)
2. [Layout Architecture](#2-layout-architecture)
3. [Route Classification](#3-route-classification)
4. [Dependency Analysis](#4-dependency-analysis)
5. [Init System Deep Dive](#5-init-system-deep-dive)
6. [Modal System Analysis](#6-modal-system-analysis)
7. [Keyboard Shortcuts Analysis](#7-keyboard-shortcuts-analysis)
8. [Marketing vs Workspace Separation](#8-marketing-vs-workspace-separation)
9. [Bugs Found](#9-bugs-found)
10. [Extraction Opportunities](#10-extraction-opportunities)
11. [Refactoring Options](#11-refactoring-options)
12. [Implementation Plan](#12-implementation-plan)

---

## 1. File Inventory

### Root Layout Imports (261 lines total)

**Store Imports (13):**
| Store | Purpose |
|-------|---------|
| `helpStore` | Help articles, tours, onboarding |
| `searchStore` | Global search modal state |
| `uiStore` | Global UI state, modals, settings |
| `vault` | Core data store, entity CRUD |
| `vaultRegistry` | Multiple vault management |
| `canvasRegistry` | Canvas state management |
| `themeStore` | Theme persistence |
| `timelineStore` | Timeline/chronology data |
| `calendarStore` | Calendar config |
| `graph` | Graph visualization state |
| `oracle` | AI assistant state |
| `categories` | Entity categories |
| `demoService` | Demo mode management |

**Component Imports (6):**
| Component | Purpose | Status |
|-----------|---------|--------|
| `AppHeader` | Top navigation bar | Already modular |
| `AppFooter` | Bottom footer | Already modular |
| `NotificationToast` | Toast notifications | Already modular |
| `FatalErrorOverlay` | Fatal error display | Already modular |
| `OracleSidebarProvider` | AI sidebar wrapper | Extracted |
| `GlobalModalProvider` | All modal management | Extracted |

**Logic Imports (5):**
| Import | Purpose | Status |
|--------|---------|--------|
| `bootSystem` | Store initialization | Extracted to `app-init.ts` |
| `initializeGlobalListeners` | Global error handlers | Extracted to `app-init.ts` |
| `setupWindowGlobals` | Debug globals | Extracted to `app-init.ts` |
| `registerServiceWorker` | PWA registration | Extracted to `app-init.ts` |
| `useGlobalShortcuts` | Keyboard shortcuts | Extracted to hook |

---

## 2. Layout Architecture

### Current Layout Tree

```
SvelteKit Layout Inheritance
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│  ROOT: apps/web/src/routes/+layout.svelte (261 lines)                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  +layout.ts: ssr=false, prerender=false                          │ │
│  │                                                                   │ │
│  │  ⚠️ PROBLEM: This runs for ALL routes including marketing!       │ │
│  │                                                                   │ │
│  │  ├─ Imports: 13 stores + 6 components + 5 logic modules         │ │
│  │  ├─ $effect blocks: 5 (boot, help hash, demo, header, onboarding)│ │
│  │  ├─ onMount: helpStore.init, themeStore.init, oracle.init        │ │
│  │  │            registerServiceWorker, initializeGlobalListeners    │ │
│  │  │            setupWindowGlobals                                  │ │
│  │  ├─ Components: AppHeader, AppFooter, OracleSidebarProvider      │ │
│  │  │               GlobalModalProvider, NotificationToast          │ │
│  │  │               FatalErrorOverlay                              │ │
│  │  └─ svelte:window: keyboard shortcuts                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                    │                                                      │
│        ┌───────────┴───────────┐                                        │
│        ▼                       ▼                                        │
│  ┌────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ (marketing) group  │  │ WORKSPACE ROUTES (at root level)         │  │
│  │                    │  │                                          │  │
│  │ +layout.svelte    │  │ +page.svelte (landing)                  │  │
│  │ (16 lines only!)   │  │ /map/**                                 │  │
│  │                    │  │ /canvas/**                              │  │
│  │ +layout.ts:       │  │ /oracle                                 │  │
│  │   ssr=true        │  │ /help                                   │  │
│  │   prerender=true   │  │ /timeline                               │  │
│  │                    │  │ /import                                 │  │
│  │ Only adds:        │  │                                          │  │
│  │ - JSON-LD        │  │ All share the root layout above!        │  │
│  │ - {render children}│  │                                          │  │
│  └────────────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### SvelteKit Layout Inheritance Rules

1. **Child layouts EXTEND parent layouts** — they don't replace them
2. `(marketing)/+layout.svelte` renders `{@render children()}` which triggers parent layout
3. Parent layout code runs FIRST, then child layout wraps around
4. The `ssr` and `prerender` settings in `(marketing)/+layout.ts` don't prevent parent layout's JS from loading client-side

### The Core Problem

```
MARKETING PAGE REQUEST FLOW
═══════════════════════════════════════════════════════════════════════════

Browser requests /blog
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  1. HTML shell served (prerendered, ✅ good)                            │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. JavaScript bundles loaded client-side                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Root layout JS executes:                                        │  │
│  │  ├─ Import 13 stores (vault, graph, oracle, etc.)               │  │
│  │  ├─ Import 6 components (AppHeader, modals, etc.)               │  │
│  │  ├─ Import init modules (app-init.ts)                            │  │
│  │  ├─ Call helpStore.init()                                        │  │
│  │  ├─ Call themeStore.init()                                      │  │
│  │  ├─ Call oracle.init()                                          │  │
│  │  ├─ Call bootSystem()                                           │  │
│  │  ├─ Mount all components (AppHeader, etc.)                       │  │
│  │  └─ Register global event listeners                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  💰 ALL THIS for a page that just shows a blog post!                   │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  3. Components rendered but hidden                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  <AppHeader> ← rendered but hidden                              │  │
│  │  <OracleSidebarProvider> ← rendered but hidden                  │  │
│  │  <GlobalModalProvider> ← mounted, watching for uiStore changes  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ❌ DOM nodes exist, event listeners attached, memory allocated         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Route Classification

### Marketing Routes (Need Minimal JS)

| Route          | File                                   | Purpose          | Current Load   |
| -------------- | -------------------------------------- | ---------------- | -------------- |
| `/blog`        | `(marketing)/blog/+page.svelte`        | Blog listing     | Full workspace |
| `/blog/[slug]` | `(marketing)/blog/[slug]/+page.svelte` | Blog post        | Full workspace |
| `/features`    | `(marketing)/features/+page.svelte`    | Feature showcase | Full workspace |
| `/privacy`     | `(marketing)/privacy/+page.svelte`     | Privacy policy   | Full workspace |
| `/terms`       | `(marketing)/terms/+page.svelte`       | Terms of service | Full workspace |

### Workspace Routes (Need Full App)

| Route            | File                         | Purpose                     |
| ---------------- | ---------------------------- | --------------------------- |
| `/`              | `+page.svelte`               | Landing page with workspace |
| `/map`           | `map/+page.svelte`           | World map view              |
| `/map/[id]`      | `map/[id]/+page.svelte`      | Map detail                  |
| `/canvas`        | `canvas/+page.svelte`        | Canvas workspace            |
| `/canvas/[slug]` | `canvas/[slug]/+page.svelte` | Canvas detail               |
| `/oracle`        | `oracle/+page.svelte`        | AI oracle popup             |
| `/help`          | `help/+page.svelte`          | Help popup                  |
| `/timeline`      | `timeline/+page.svelte`      | Timeline view               |
| `/import`        | `import/+page.svelte`        | Import wizard               |

### Popup Routes (Special Case)

These routes are rendered in popups, hiding certain UI elements:

```typescript
const isPopup = $derived(
  page.url.pathname === `${base}/oracle` ||
    page.url.pathname === `${base}/help` ||
    page.url.pathname === `${base}/import`,
);
```

---

## 4. Dependency Analysis

### What Each Store Actually Needs

| Store            | Needs Vault | Needs Graph | Needs Calendar | Used on Marketing |
| ---------------- | ----------- | ----------- | -------------- | ----------------- |
| `helpStore`      | No          | No          | No             | ❌ No             |
| `searchStore`    | No          | No          | No             | ❌ No             |
| `uiStore`        | Partial     | No          | No             | ⚠️ Partial        |
| `vault`          | —           | No          | No             | ❌ No             |
| `vaultRegistry`  | Yes         | No          | No             | ❌ No             |
| `canvasRegistry` | Yes         | No          | No             | ❌ No             |
| `themeStore`     | No          | No          | No             | ❌ No             |
| `timelineStore`  | No          | Yes         | No             | ❌ No             |
| `calendarStore`  | Yes         | No          | No             | ❌ No             |
| `graph`          | No          | —           | No             | ❌ No             |
| `oracle`         | Yes         | No          | No             | ❌ No             |
| `categories`     | No          | No          | No             | ❌ No             |

**Conclusion:** ZERO stores are needed for marketing pages. ALL are workspace-only.

---

## 5. Init System Deep Dive

### bootSystem() — The Heavy Lifter

**Location:** `apps/web/src/lib/app/init/app-init.ts`

```typescript
export function bootSystem(stores: {
  categories: any;
  timeline: any;
  graph: any;
  calendar: any;
  vault: any;
}): boolean {
  debugStore.log("System booting: Initializing heavy stores...");

  // These can run in parallel (all hit IndexedDB independently)
  stores.categories.init(); // Sync
  stores.timeline.init(); // ⚠️ NO-OP
  stores.graph.init(); // Async
  stores.calendar.init(); // Async

  // This has side effects (dispatches vault-switched)
  stores.vault.init().catch((error: any) => {
    console.error("Vault initialization failed", error);
  });

  return true;
}
```

**Observations:**

1. All stores hit IndexedDB independently — could use `Promise.all()`
2. `timeline.init()` is a stub — dead code
3. `vault.init()` swallows errors silently with `.catch()`
4. `calendar.init()` depends on `vault.activeVaultId` but runs in parallel

### initializeGlobalListeners() — Event Plumbing

```typescript
export function initializeGlobalListeners(uiStore: any, calendarStore: any) {
  // Returns cleanup function

  // 1. Global error handler
  window.addEventListener("error", handleGlobalError);

  // 2. Unhandled promise rejection handler
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  // 3. Vault switched event → calendar re-init
  window.addEventListener("vault-switched", handleVaultSwitched);
}
```

### Error Patterns Filtered Out

```typescript
const IGNORED_ERRORS = [
  "Script error",
  "Load failed",
  "isHeadless",
  "notify",
  "INTERNET_DISCONNECTED",
  "Failed to fetch",
  "NetworkError",
  "ResizeObserver loop completed",
];
```

### setupWindowGlobals() — Debug Attacher

Only in DEV, staging, or E2E mode. Attaches stores/services to `window` for debugging.

### registerServiceWorker() — PWA Enabler

Only registers in production. Silent failure with `console.warn`.

---

## 6. Modal System Analysis

### GlobalModalProvider Architecture

Already handles lazy-loading of modals with `$state<any>(null)` pattern.

### All Modals Registered

| Modal         | Component          | Lazy   | Condition                    |
| ------------- | ------------------ | ------ | ---------------------------- |
| Search        | `SearchModal`      | ❌ No  | Always                       |
| Settings      | `SettingsModal`    | ❌ No  | browser + not login          |
| Oracle        | `OracleWindow`     | ✅ Yes | Not login route              |
| Zen Mode      | `ZenModeModal`     | ✅ Yes | uiStore.showZenMode          |
| Tour          | `TourOverlay`      | ✅ Yes | helpStore.activeTour         |
| Mobile Menu   | `MobileMenu`       | ❌ No  | Not login route              |
| Merge Nodes   | `MergeNodesDialog` | ✅ Yes | uiStore.mergeDialog.open     |
| Bulk Label    | `BulkLabelDialog`  | ✅ Yes | uiStore.bulkLabelDialog.open |
| Dice          | `DiceModal`        | ✅ Yes | Always                       |
| Debug Console | `DebugConsole`     | ✅ Yes | DEV/E2E/staging only         |

---

## 7. Keyboard Shortcuts Analysis

### useGlobalShortcuts Hook

**Location:** `apps/web/src/lib/hooks/useGlobalShortcuts.svelte.ts`

### Handled Shortcuts

| Shortcut           | Action                        |
| ------------------ | ----------------------------- |
| **Cmd+K / Ctrl+K** | Toggle search modal           |
| **Escape**         | Close search → close settings |

### Scope Analysis

| Question                         | Answer                                          |
| -------------------------------- | ----------------------------------------------- |
| Is it truly global?              | Yes, attached to `svelte:window` in root layout |
| Does it work on marketing pages? | Yes, but does nothing                           |
| Browser overhead?                | Minimal (single event listener)                 |

**Recommendation:** Keep in root layout. The overhead is negligible.

---

## 8. Marketing vs Workspace Separation

### What Each Route Type Needs

| Need               | Marketing           | Workspace |
| ------------------ | ------------------- | --------- |
| `app.css`          | ✅ Yes              | ✅ Yes    |
| SEO meta tags      | ✅ Yes              | ❌ No     |
| JSON-LD            | ✅ Yes              | ❌ No     |
| Stores             | ❌ No               | ✅ Yes    |
| bootSystem         | ❌ No               | ✅ Yes    |
| AppHeader          | ⚠️ Marketing header | ✅ Yes    |
| AppFooter          | ⚠️ Marketing footer | ✅ Yes    |
| Sidebar            | ❌ No               | ✅ Yes    |
| Modals             | ❌ No               | ✅ Yes    |
| Keyboard shortcuts | ⚠️ No-op            | ✅ Yes    |

---

## 9. Bugs Found

### Bug 1: Race Condition on `vault-switched`

```
$effect (bootSystem) → dispatches vault-switched
        ↓
onMount (initializeGlobalListeners) → registers vault-switched listener
```

If `vault-switched` fires between these two, the listener misses it.

**Fix:** Register listeners before calling bootSystem, or use `$effect.pre()`.

### Bug 2: `timeline.init()` is Dead Code

The `timeline.init()` call in `bootSystem` is stubbed. Eras are now managed by `graph` store.

**Fix:** Remove from bootSystem.

### Bug 3: Marketing Pages Mount Hidden Components

`AppHeader`, `AppFooter`, `OracleSidebarProvider` are rendered but hidden on marketing pages.

**Fix:** Route group separation solves this.

---

## 10. Extraction Opportunities

### Already Extracted ✅

| Module                      | Location                                         |
| --------------------------- | ------------------------------------------------ |
| `GlobalModalProvider`       | `components/modals/GlobalModalProvider.svelte`   |
| `OracleSidebarProvider`     | `components/layout/OracleSidebarProvider.svelte` |
| `bootSystem`                | `lib/app/init/app-init.ts`                       |
| `initializeGlobalListeners` | `lib/app/init/app-init.ts`                       |
| `setupWindowGlobals`        | `lib/app/init/app-init.ts`                       |
| `registerServiceWorker`     | `lib/app/init/app-init.ts`                       |
| `useGlobalShortcuts`        | `lib/hooks/useGlobalShortcuts.svelte.ts`         |

---

## 11. Refactoring Options

### Option A: Full Route Group Split

```
┌─────────────────────────────────────────────────────────────────────────┐
│  +layout.svelte (minimal shell)                                        │
└─────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   (marketing)     (app)     [others]
```

**Pros:** Cleanest separation, best performance
**Cons:** URL changes (requires redirects)

### Option B: Selective Lazy Loading

Keep current layout structure but lazy-import everything.

**Pros:** No route changes, incremental
**Cons:** Stores still bundled, root layout stays complex

### Option C: Hybrid Route Group (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  +layout.svelte (minimal shell)                                        │
└─────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   (marketing)               (app)
   [unchanged]              [new]
```

**Pros:** Marketing isolated, no URL changes, moderate complexity
**Cons:** Landing page moves to `(app)` group

---

## 12. Implementation Plan (Option C)

### Phase 1: Create (app) Route Group

- [ ] Create `routes/(app)/` directory
- [ ] Move `+page.svelte`, `map/`, `canvas/`, `oracle/`, `help/`, `timeline/`, `import/`
- [ ] Create `(app)/+layout.svelte` with full root layout code
- [ ] Create `(app)/+layout.ts` with `ssr: false, prerender: false`

### Phase 2: Strip Root Layout

- [ ] Remove all store imports
- [ ] Remove all component imports
- [ ] Remove all `$effect` blocks
- [ ] Remove `onMount` initialization
- [ ] Keep only: app.css import, basic HTML shell, svelte:head meta tags

### Phase 3: Fix Bugs

- [ ] Fix race condition on `vault-switched`
- [ ] Remove dead `timeline.init()` call

### Phase 4: Test

- [ ] Marketing pages load without workspace code
- [ ] All workspace routes work
- [ ] Navigation works
- [ ] Keyboard shortcuts work

### Phase 5: Update Docs

- [ ] Update GOD_FILES_ANALYSIS.md

---

## Success Metrics

| Metric                           | Before         | After   |
| -------------------------------- | -------------- | ------- |
| Root layout lines                | 261            | ~25     |
| Store imports in root            | 13             | 0       |
| Component imports in root        | 6              | 0       |
| Marketing page JS bundle         | Full workspace | Minimal |
| bootSystem() on marketing        | Yes            | No      |
| Race condition on vault-switched | Yes            | No      |
| timeline.init() calls            | Yes            | No      |
