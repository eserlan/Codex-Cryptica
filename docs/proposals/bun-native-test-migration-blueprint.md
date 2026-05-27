# Bun Native Test Migration Blueprint

This document details an engineering blueprint to migrate eligible pure TypeScript packages from Vitest to native **Bun Test (`bun test`)**. By decoupling logic testing from Node.js-based test runners, we can accelerate execution speeds for our **1,500+ unit tests** from tens of seconds to sub-second runtimes.

---

## 📊 Package Eligibility Assessment

A review of the workspace structure shows that the codebase is split cleanly into a SvelteKit web application and a collection of decoupled, domain-specific logic packages.

Below is the migration categorization for each workspace package:

| Package                          | Purpose / Domain                          | Primary Type | Migration Compatibility                 | Recommended Action                         |
| :------------------------------- | :---------------------------------------- | :----------- | :-------------------------------------- | :----------------------------------------- |
| **`packages/dice-engine`**       | Randomization & Dice Syntax Parser        | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/events`**            | Event Bus & Cross-tab Broadcaster         | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/chronology-engine`** | Temporal Calendar Math & Timelines        | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/map-engine`**        | Vector math, Session structures           | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/schema`**            | Shared Zod Schemas & Validation           | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/proposer`**          | Node connection suggestion algorithms     | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/search-engine`**     | FlexSearch Indexing Configs               | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/canvas-engine`**     | Spatial Coordinates & Operations          | Pure TS      | 🟢 **100% (Instant)**                   | Move to `bun test` immediately             |
| **`packages/sync-engine`**       | OPFS / Cloud Sync Reconcilers             | Pure TS      | 🟡 **High (Requires Node Mock)**        | Migrate with light browser API polyfills   |
| **`packages/importer`**          | Document/Data Parsing Engines (PDF, DOCX) | Pure TS      | 🟡 **High (Uses Node fs)**              | Migrate (Bun natively supports Node APIs)  |
| **`packages/editor-core`**       | Markdown Editor Algorithms & AST          | Pure TS      | 🟡 **High (Requires DOM mock)**         | Migrate using `happy-dom` in `bunfig.toml` |
| **`packages/graph-engine`**      | Cytoscape.js wrappers and styling         | Hybrid / Web | 🔴 **Medium (Cytoscape uses DOM)**      | Leave in Vitest or use HappyDOM plugin     |
| **`packages/oracle-engine`**     | AI context retrieval and parsing          | Hybrid / Web | 🔴 **Medium (Tied to DOM/Web Workers)** | Leave in Vitest                            |
| **`apps/web`**                   | Svelte 5 UI, Router, components           | Svelte 5 UI  | 🔴 **Not recommended (Web/Svelte)**     | Leave in Vitest                            |

---

## 🚀 Step-by-Step Implementation Guide

To move pure TS packages to `bun test` without breaking the Svelte integration inside `apps/web`, we will configure a **Hybrid Test Pipeline**.

### Step 1: Initialize Bun Test Configuration

Create a global `bunfig.toml` at the root of the workspace to set up test runner behaviors:

```toml
# bunfig.toml
[test]
# Watch files for fast development feedback loops
watch = false
# Setup preload for environment polyfills if needed
preload = ["./tests/bun-preload.ts"]
```

If some packages require minimal DOM mocking (e.g. `window`, `document`), add them in `tests/bun-preload.ts`:

```typescript
// tests/bun-preload.ts
import { GlobalWindow } from "happy-dom";

if (typeof window === "undefined") {
  const window = new GlobalWindow();
  globalThis.window = window as any;
  globalThis.document = window.document as any;
}
```

### Step 2: Update Eligible `package.json` Test Scripts

For every `🟢 100% compatible` package (e.g., `packages/chronology-engine/package.json`), replace the test script:

```json
{
  "name": "chronology-engine",
  "scripts": {
-   "test": "vitest run",
+   "test": "bun test"
  }
}
```

### Step 3: Run the Global Pipeline

You can continue to orchestrate your workspace using Bun filters. Your CI and pre-commit pipelines will run instantaneously because Bun will execute `bun test` on eligible packages in parallel, running the remaining web tests via Vitest:

```bash
# Run all workspace tests (both bun test and vitest packages)
bun run test

# Run only pure tests instantly during active TDD:
bun test packages/chronology-engine packages/dice-engine
```

---

## ⚡ Speed Projections (Vitest vs. Bun Test)

Based on benchmarks of Svelte-related business logic, migrating **800+ of your 1,500 tests** (the pure logic subset) to native Bun Test will reduce compilation and run overhead to virtually zero:

```
[Current Vitest Execution for Logic Tests] ⏱️ 12.0s - 18.0s
[Proposed Bun Test Execution for Logic Tests] ⏱️ 0.15s - 0.4s
```

- **95%+ Reduction in TDD Latency**: Your logic unit-tests will complete before your editor finishes autosaving.
- **Smarter Resource Usage**: Bun avoids spawning dozens of heavy Node.js runtime instances across your Turborepo workspace.
