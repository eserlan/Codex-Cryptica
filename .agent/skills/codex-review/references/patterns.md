# Codex Review Patterns

This reference documents project-specific regressions and quality standards for Codex-Cryptica.
Apply a pattern when the changed code enters that boundary; do not turn a narrow historical
regression into an unrelated style finding. Every reported issue needs a changed-code location,
a concrete failure mode, and an appropriate focused validation or regression test.

## Svelte 5 & Reactivity

### Race Conditions in Async Handlers

- **Issue**: Multiple clicks on a "Commit" or "Save" button triggering multiple async operations.
- **Pattern**: Guard re-entry, reset the guard in `finally`, and prevent an older request from
  overwriting state after a newer request, close, or cancellation. Use an `AbortSignal` or a
  request/version token when the operation can outlive the component or be superseded.
- **Example**:

```svelte
<script>
  let isCommitting = $state(false);
  async function handleCommit() {
    if (isCommitting) return; // REQUIRED
    isCommitting = true;
    try {
      await commit();
    } finally {
      isCommitting = false;
    }
  }
</script>
```

- **Per-item actions**: The guard applies to every button that starts a create/save, including
  per-row or per-part buttons (landmark, encounter, hazard). A save that checks "is this part still
  pending?" and then awaits entity creation lets a double-click create two entities and two pins
  (PR #4152). Disable the part's actions while its save is in flight.

### Captured State Written Back After an Await

- **Issue**: A handler reads `selectedIds` (or a draft, a list, a form) before `await`, edits that
  captured copy when the operation finishes, and assigns it back. Anything the user changed during
  the await is overwritten (PR #4168 bulk delete).
- **Pattern**: After an await, re-read the current state and apply only the delta (remove the ids
  that succeeded). For superseding requests (file pickers, directory drops, regenerate), take a
  request token before the first await and drop the result if a newer token exists (PR #4142: two
  rounds, the second because a directory traversal awaited before taking the token).
- **Check**: The test must drive the real wiring (the route callback), not a test-supplied updater
  that already does the right thing.

### Direct Prop State Initialization

- **Issue**: Initializing `$state` directly from a prop (`let x = $state(props.x)`) breaks reactivity if the prop changes.
- **Pattern**: Use `$derived` if it should stay in sync, or explicitly document if a local copy is intended.

### Svelte 5 Runes in Non-compiled Modules

- **Issue**: Calling Svelte 5 runes (such as `$effect`, `$state`, `$derived`, etc.) inside a plain `.ts` module (e.g., `events.ts`). Svelte 5 runes are only compiled in `.svelte` or `.svelte.ts` modules. Plain `.ts` files do not undergo the runic compiler transformation, leading to runtime failures where the compiler complains that `$effect` (or other runes) is not defined (even if Vitest stubs it or masks it in test runs).
- **Pattern**: Always use the `.svelte.ts` extension for any helper library, store, or service that uses Svelte 5 runes, or structure the API to return clean callback functions (like an `unsubscribe` function) so the component caller can wrap the subscription in its own `$effect`.

### Svelte 5 Runes in Web Worker Bundles

- **Issue**: Importing files containing Svelte 5 runes (such as `$state`, `$derived`, `$effect`, or `$state.snapshot`) into a Web Worker (e.g., `oracle.worker.ts`). Since the Web Worker environment runs in a separate thread without Svelte's runtime globally registered or compiled, these runes trigger fatal runtime crashes: `ReferenceError: $state is not defined`.
- **Pattern**: Never reference Svelte runes or compiler instructions inside Web Worker scripts or
  files transitively imported by them. Pass cloneable data across the boundary, preserve request
  correlation/cancellation, and validate the message shape before using it. When a worker bundle
  changes, run `bun --cwd apps/web run build`; that build executes
  `apps/web/scripts/check-compiled-runes.js`.

### Component Mount Hierarchy vs Navigation Lifecycles

- **Issue**: Registering view-level contexts, Help Assistant surfaces, or global listeners inside a child component that only renders for one tab in a multi-tab view (e.g. `ZenContent.svelte` mounted only inside the Overview tab of `ZenView.svelte`). When the user switches tabs (to Connections, Map, Family, etc.), the child component unmounts, tearing down the registered context while the view is still active, causing Help to fall back or features to become unreactive.
- **Pattern**: Register persistent view-level contexts and lifecycles in the root view component (e.g. `ZenView.svelte`) and reactively pass or derive the active tab. Never place view-wide lifecycle bindings in sub-components that unmount during internal tab navigation.
- **Example**:

```svelte
<!-- Bad: Help surface unmounts whenever activeTab != 'overview' -->
<!-- ZenContent.svelte -->
<script>
  $effect(() => {
    helpContextStore.registerSurface({ id: 'zen', name: 'Zen Mode' });
    return () => helpContextStore.unregisterSurface('zen');
  });
</script>

<!-- Good: Registered at the persistent container, reacting to activeTab -->
<!-- ZenView.svelte -->
<script>
  $effect(() => {
    helpContextStore.registerSurface({
      id: 'zen',
      name: `Zen Mode (${activeTab})`,
      currentTab: activeTab
    });
    return () => helpContextStore.unregisterSurface('zen');
  });
</script>
```

## Oracle & AI Logic

### Aggressive Regex Parsing

- **Issue**: Commands like `/create "Name"` matching even when extra text is provided, causing AI context loss.
- **Pattern**: Match the complete deterministic command (`^...\s*$`) and test the near miss.
  Text that adds a description or changes the command's shape must fall through to normal AI
  handling rather than silently discarding user intent.
- **Check**: Does the parser have tests for the exact command, trailing whitespace, and extra text?

### Web Worker Proxy Binding

- **Issue**: Calling methods on the `OracleWorker` proxy that aren't exposed in the `OracleWorker` class.
- **Pattern**: Every AI generation method in `TextGenerationService` must have a corresponding
  wrapper in `oracle.worker.ts`, with the same input/output contract, error path, and cancellation
  behaviour. Verify both directions of the RPC boundary, not only the happy path.

### Batch Processing Heuristics

- **Issue**: Massive batch AI reconciliation slowing down the UI.
- **Pattern**: Bound concurrency and work per turn. The appropriate limit depends on model latency,
  payload size, and the interaction; document it beside the queue/batch and provide cancellation or
  yielding for work that can outlive the current view. Do not introduce an arbitrary threshold
  without a user-facing reason or measurement.

### AI Output Is Untrusted Input

- **Issue**: Treating model output as a trusted command, schema, URL, HTML fragment, or persistence
  payload can create malformed state, unsafe rendering, or unexpected tool actions.
- **Pattern**: Parse AI output at the boundary with the existing schema (for example, Zod), reject
  invalid or partial results, and keep tool selection and side effects explicitly controlled by the
  application. Do not infer permissions or execute model-provided paths, URLs, or identifiers.
- **Check**: Are malformed, missing-field, oversized, and cancellation/error responses covered by
  focused tests?

### Model-Output Shape Guards That Let Junk Through

Luna finds these in almost every generator PR. Check each guard in the diff against this list:

- `typeof x === "object"` accepts `null` and arrays (`JSON.parse("null")`, `"[]"`); PRs #4114,
  #4115 marked a review "done" on a `null` reply.
- `{}` is a truthy object: a stage or section that "parsed" can still be missing every field it
  exists to provide (PR #4115 finale). Check required fields, not truthiness.
- `Number(x)` / `parseInt` on model text yields `NaN`, and every comparison with `NaN` is false, so
  `NaN < 1` passes a minimum check (PR #4124 `start: "many"`). Use `Number.isFinite`.
- Model text interpolated into `new RegExp(...)` must be escaped; `"["` throws during rendering
  (PR #4127).
- Ids from the model can repeat. Anything keyed by id (decisions, theories, NPCs) needs a
  duplicate check (PR #4122).
- Bounds need a minimum **and** a maximum: "three to six scenes" with only `< 3` rejected lets
  seven through (PR #4105). The same applies to user number inputs whose label promises a range
  (PR #4130 party size 1–8 with no `min`/`max`/`step`).
- Graphs from the model need reachability (every scene reaches the climax, no self-loop trap) and
  must not assume array order is topological order (PRs #4105, #4127).
- Silent truncation (`.slice(0, MAX)`) followed by marking the item saved discards generated text
  the user can no longer recover (PR #4152). Reject or keep the draft instead.

### Heuristic Prose Checks (Regex Validators)

- **Issue**: Deterministic "consistency checks" over generated prose (`isVague`, clock schedule,
  NPC confinement explained, place-name grounding, owned-goal detection) are regexes over natural
  language. Each fix moves the false positive/negative somewhere else, and Luna finds a new
  counterexample every round: PR #4111 `isVague` took five rounds, PR #4120 clock and NPC
  continuity took four.
- **Pattern**: Before shipping such a check, write a counterexample table into the test file:
  at least two inputs that **should** be flagged and two that **must not** be, including an
  unrelated clause sharing the sentence ("…while the party was dragged here"), a list with
  multiword items, punctuation (`:`, `'`, quotes), number words beyond ten, and a recurring-time
  phrase that is not the trigger. Re-run the whole table after every fix.
- **Prefer structure**: If the model can return the fact as a field (an explicit `cause`, a
  `trigger` enum, an id reference), check the field instead of parsing prose.
- **Stop rule**: If a heuristic needs a third round, make it a soft warning (fed to repair, never a
  rejection) and document the known limits in its doc comment, rather than layering another
  regex.

### Staged and Multi-Call AI Pipelines

- **Abort end to end**: Every staged pipeline accepts an `AbortSignal`, checks it between calls,
  and the caller passes it and aborts on destroy (PR #4115). Follow the signal down to the actual
  `fetch`: the default proxy model dropped it, so aborting the panel left the request running
  (PR #4105). A wrong option shape (`{ signal }` where the API takes `signal`) also breaks it.
- **Retry symmetry**: If the main stages retry once, the review/repair call must too, or a
  transient failure shows a "review skipped" notice that one retry would have avoided (PR #4115).
- **Fallback conditions**: When a staged route is placed in front of an existing route, list what
  the old route carried that the staged calls do not: continuity/interaction thread, prompt
  metrics, previews, vault context. A request that needs one of those must stay on the old route
  (PR #4186 continuity thread).
- **Override honoured on retry**: A "Retry with AI" button must pass the AI override; calling the
  default handler re-reads the toggle and generates locally (PR #4114).

### Domain Grounding & Fact Consistency

- **Issue**: Documentation, Help assistant feature registries, or AI prompts make assertions about product restrictions or workflows that contradict the actual codebase (e.g. claiming Demo vaults are read-only and block entity revisions, when Demo vaults actually operate in in-memory "TRANSIENT MODE" allowing mutations and revisions are only rejected in Guest mode).
- **Pattern**: Cross-reference documented product capabilities and restrictions with the actual implementation (`isDemo` vs `isGuest`, store mutation guards) before encoding rules into help registries or system prompts. AI grounding must reflect codebase reality.

## Trust, Privacy & Public Boundaries

### Untrusted Markdown, HTML and Remote Tracking (Constitution IV)

- **Issue**: Rendering imported, generated, or remote text through `{@html}` without sanitizing it creates an XSS boundary. Furthermore, default DOMPurify configurations permit `<img>` tags and `https:`, `data:`, and `blob:` URLs. If untrusted AI model output or imported notes contain `![tracking](https://attacker.com/pixel.png)`, the browser automatically issues a remote fetch, leaking the user's IP address, timestamp, and session metadata—violating local-first privacy (Constitution Principle IV).
- **Pattern**: Use the existing `renderMarkdown` utility with strict configuration, or use an allowlisted structured renderer. For AI-generated content (such as Help responses or Oracle chat), use an explicit allowlist of safe formatting tags (e.g. `p`, `strong`, `em`, `code`, `pre`, `ul`, `ol`, `li`, `blockquote`) that strictly excludes `<img>`, `<audio>`, `<video>`, `@import`, and arbitrary remote asset URLs. Add focused tests proving remote image tags are stripped before DOM injection.
- **Saved into the vault**: The default vault renderer still allows `https:` images, so model text
  saved as entity content or lore is the same risk at a later time (PRs #4125, #4152). Strip images
  when the text is saved.
- **Every field**: Filter every model-supplied string that reaches the Markdown, not just the
  obvious body. PR #4125 filtered `rulesText`, then Luna found `attunementRequirement` and
  `rechargeRate` interpolated unfiltered into the same document. List the interpolated fields and
  test one that is not the body.

### AI Disclosure Before the First Request, on Every Path

- **Issue**: The "what leaves your device" notice is rendered inside a view that exists only after
  the first AI call, or the acknowledgement guard covers only the main button while Retry and
  Regenerate call the AI directly (PR #4152, two rounds).
- **Pattern**: List every action that sends data to a model (first run, retry, regenerate, refine,
  auto-run on open) and confirm each is behind the same disclosure/acknowledgement check. Test one
  secondary path with the notice unacknowledged.

### External Responses and Stored Documents

- **Issue**: Assuming a response, import, or persisted document has the current shape causes crashes
  and can expose prototype-pollution or invalid-reference paths.
- **Pattern**: Validate at the boundary with the relevant schema before reading fields. Reject
  reserved keys and impossible IDs where the domain requires it; make errors user-safe and avoid
  logging private document content.

### Public Projection Must Be Deliberate

- **Issue**: Reusing an internal vault/entity object for guest, share, support, or public APIs can
  leak owner tokens, local paths, private notes, identifiers, or assets not intended for sharing.
- **Pattern**: Construct a dedicated public projection and validate it with the public schema. Treat
  a new field on an internal type as private until it is explicitly reviewed into that projection.
- **Check**: Does the changed public response have a negative test proving private fields are absent?
- **Metadata pass-through**: An importer that copies every source field into `metadata` carries
  private ones (Chronica `gm_secrets`) into a field the guest exporter does not strip (PR #4142,
  HIGH). Importers map an allowlist of fields; anything GM-only goes to a field the exporter
  already removes.

## UI & Accessibility

### Autocomplete Accessibility

- **Issue**: Missing `ariaLabel` on `Autocomplete` components.
- **Pattern**: Always provide `ariaLabel` or equivalent descriptive prop for screen readers.

### Icon Usage

- **Issue**: Using `lucide-svelte` components instead of Iconify classes.
- **Pattern**: Use `class="icon-[lucide--name] ..."`.

### Flexbox Truncation Layouts

- **Issue**: Using Tailwind's `truncate` utility on elements inside a flex container (such as a dropdown row or card) does not truncate correctly and can push adjacent sibling elements off-screen or cause layouts to overflow. Flexbox's default behavior is to use `min-content` for flex items, preventing them from shrinking below their content size.
- **Pattern**: Always add an explicit `min-w-0` to the flex item that contains the `truncate` element to allow it to shrink and truncate correctly.
- **Example**:

  ```svelte
  <!-- Bad: can overflow or push sibling elements off-screen -->
  <div class="flex items-center gap-2">
    <span class="truncate">{label}</span>
    <span class="shrink-0">(12)</span>
  </div>

  <!-- Good: truncates correctly within flexbox bounds -->
  <div class="flex items-center gap-2">
    <span class="truncate min-w-0 flex-1">{label}</span>
    <span class="shrink-0">(12)</span>
  </div>
  ```

### Pointer Click-Drag Drift Prevention

- **Issue**: On highly interactive coordinate-based canvases, maps, or drag-and-drop grids, simple mouse/pointer click selections can trigger tiny coordinates changes (micro-movements/sub-pixel drift) due to hardware sensitivity or handshake jitters. This causes elements to "drift" from their precise coordinates on a simple selection click.
- **Pattern**: Implement a pointer displacement gate (e.g., `threshold = 5px`) in mouse/pointer move listeners. Defer initiating dragging states or updating core coordinate variables until the physical distance between the initial pointer position and the current pointer position is equal to or greater than the threshold.
- **Example**:

  ```typescript
  // Inside onMouseMove / onPointerMove
  const dx = currentX - startX;
  const dy = currentY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (!isDragging && distance < 5) {
    // Gate dragging initialization/coordinate update to prevent click drift
    return;
  }

  isDragging = true;
  // Keep the grab offset: the node must not jump so its centre sits under the pointer.
  updateCoordinates(startNodeX + dx, startNodeY + dy);
  ```

- **Consistency**: The first move after the threshold and every later move must use the same
  formula. Mixing "origin + displacement" on the first move with "absolute pointer position" on
  later moves makes the node jump (PR #4158, found in the fix of the threshold finding).

### Pointer Cancel Is Not Pointer Up

- **Issue**: `onPointerCancel` delegating to `handlePointerUp` turns an interrupted touch into a
  click (opens a panel) or commits a half-finished drag (PR #4152).
- **Pattern**: Cancel must abort every gesture state the handler owns (pan, box select, token drag,
  rotation, pin drag, grid fit, fog stroke), commit nothing, and restore any live mutation made
  during the gesture (a fog painter that paints into the mask must restore its snapshot). Test a
  cancel during each gesture type, then a following pointer move.

### Visually Hidden Transition Elements & Accessibility Trees

- **Issue**: Elements that use Tailwind transition classes (like `opacity-0`, `scale-95`, or `pointer-events-none`) to fade out or animate away are still present in the DOM. Even when fully invisible to sighted users, they remain visible to assistive technologies (screen readers, keyboard focus tabs, etc.), resulting in an inaccessible experience.
- **Pattern**: Dynamically apply `aria-hidden="true"` or `inert` to transition elements, modal overlays, or backdrops when their visibility state is closed or hidden, or conditionally unmount them entirely if Svelte transitions are used instead.

### Custom Dialog Focus and Keyboard Lifecycle

- **Issue**: A custom modal that only looks like a dialog can leave focus behind the overlay, trap it
  nowhere, or fail to restore it when closed (PR #4158 fullscreen graph).
- **Pattern**: Prefer the existing dialog/modal primitives. If a custom dialog is necessary, provide
  an accessible name, move focus inside on open, keep it there, support Escape when dismissal is
  allowed, and restore focus to the triggering control. Verify keyboard-only navigation.
- **Every opener**: List every path that opens the panel (button, keyboard shortcut, "Go to",
  programmatic offer, deep link). Focus restore that works only when an opener element is passed
  leaves the other paths focusing a removed node (PR #4152).

### Reduced Motion Gates the Behaviour, Not Only the Transition

- **Issue**: Wrapping only the CSS `transition` in `prefers-reduced-motion: no-preference` still
  moves the element; it now jumps instead of gliding (PR #4091 Cif pointer).
- **Pattern**: Under reduced motion, render the end state directly (skip the launch frame, the
  flight, the scroll). Test with `matchMedia` mocked to `reduce`.

### Theme Tokens Must Exist

- **Issue**: A utility such as `text-theme-on-primary` or `hover:text-theme-error` compiles to
  nothing when `apps/web/src/app.css` defines no matching `--color-theme-*` variable, so the
  element silently inherits a colour that fails contrast (PRs #4157, #4173). The danger token is
  `theme-danger`, not `theme-error`.
- **Pattern**: For every new `theme-*` utility in the diff, grep `apps/web/src/app.css` for
  `--color-theme-<name>`. A missing token is a finding.

### Multi-Theme Text and Control Contrast

- **Issue**: A colour pair is checked in one or two themes, or against the 3:1 control threshold,
  and fails elsewhere. Luna computes the actual ratio across every theme (PR #4150: Wasteland badge
  `text-theme-primary` on `bg-theme-primary/15`; PR #4173: Horror `bg-theme-primary text-theme-bg`
  at 4.22:1).
- **Thresholds**: 4.5:1 for normal-size text (including `text-sm`, 10–12px badges and button
  labels); 3:1 only for large text (≥ 24px, or ≥ 18.66px bold), icons and control boundaries.
- **Pattern**: Do not reason about contrast by eye. Run the check over every theme in
  `packages/schema` (`THEMES` plus the `_light` / `_dark` variants), compositing any `/NN` opacity
  over the surface it sits on. `bg-theme-primary text-theme-bg` is **not** safe in every theme;
  use `text-theme-on-primary`, which `app.css` overrides where the background token fails.
- **Check** (from `packages/schema`; edit the two pairs to the classes under review):

```sh
bun -e '
import * as S from "./src/index.ts";
const mix = (a, b, t) => ({ r: a.r*t+b.r*(1-t), g: a.g*t+b.g*(1-t), b: a.b*t+b.b*(1-t) });
const themes = new Map([...Object.values(S.THEMES), ...Object.values(S)
  .filter((v) => v && typeof v === "object" && "tokens" in v && /_(dark|light)$/.test(v.id ?? ""))]
  .map((t) => [t.id, t]));
for (const [id, { tokens: k }] of themes) {
  const c = (x) => S.parseColor(x);
  const solid = S.contrastRatio(c(k.background), c(k.primary));                 // text-theme-bg on bg-theme-primary
  const tint = S.contrastRatio(c(k.primary), mix(c(k.primary), c(k.surface), 0.15)); // text-theme-primary on bg-theme-primary/15
  if (solid < 4.5 || tint < 4.5) console.log(id, solid.toFixed(2), tint.toFixed(2));
}'
```

The script reads theme tokens only; per-theme overrides in `app.css` (such as Horror's
`--color-theme-on-primary: #fff`) must be applied by hand. Any line printed is a failing theme.

## Event Bus & Lifecycles

### Subscription Memory Leaks in Stores & Tests

- **Issue**: Subscribing to an event bus (e.g., `VaultEventBus`) in a store constructor without saving the unsubscribe callback. Repeated instantiations in unit tests accumulate listeners, resulting in major memory leaks and cross-test interference.
- **Pattern**: Always use named subscriptions to automatically override prior listeners, save the unsubscribe callback, and invoke it inside a clean `destroy()` method.
- **Example**:

```typescript
class FeatureStore {
  private unsubscribe: (() => void) | null = null;
  constructor() {
    this.unsubscribe = vaultEventBus.subscribe((event) => {
      // handler
    }, "feature-store-listener-id");
  }
  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
```

### Transition Status Gating

- **Issue**: Attempting to catch state changes (such as draft approvals) by checking pre-transition statuses (e.g. `entity.status === 'draft'`) when the event bus payload actually emits the finalized post-transition state.
- **Pattern**: Read the event contract before adding a condition. Gate on the post-transition value
  actually emitted by that event, and verify the transition once instead of reacting to both stale
  state and the patch independently.

### Cancellation and Stale Completion

- **Issue**: An async task can resolve after navigation, replacement, or cancellation and then mutate
  a destroyed view or newer state.
- **Pattern**: Thread `AbortSignal` through cancellable work, stop progress/state updates once it is
  aborted, and dispose listeners, workers, object URLs, and subscriptions during teardown. Test a
  cancellation between meaningful phases, not only before the task starts.

### Debounce Timers & Async Invalidation Lifecycle

- **Issue**: Introducing async delayed operations or debounce timers (e.g. `setTimeout(..., SHARPEN_DELAY_MS)`) without clearing the timeout on component destroy or when new operations supersede them. Uncancelled timers outlive the component lifecycle, cause memory leaks, or update stale DOM nodes. Furthermore, lack of fake-timer unit tests leaves rapid re-triggering and coarse-to-fine invalidations unverified.
- **Pattern**: Always store timer IDs and invoke `clearTimeout()` in cleanup functions (`onDestroy` or `$effect` return). Add unit tests using `vi.useFakeTimers()` to verify that rapid successive calls properly debounce, and that timers cancel cleanly when superseded.

## Data Gating & Optimization

### Redundant Debounced Auto-Saves

- **Issue**: Running debounced auto-save effects that trigger on mere selection or opening of existing entries, causing redundant database writes and unnecessary load.
- **Pattern**: Track the active item's original content and ID. Only trigger the debounce routine when the content has _actually_ diverged from the loaded state, and skip/gate empty brand-new entries until the user has typed.

### Unique Value Counting per Record (De-duplication)

- **Issue**: Standard mapping/iteration over list-based properties (like `entity.labels`) to calculate item frequencies or metrics will overcount entries if a single record contains duplicate values in that array.
- **Pattern**: Always de-duplicate array-like properties per record using `new Set()` before counting or executing metrics logic.
- **Example**:

  ```typescript
  // Bad: overcounts if entity.labels has duplicate values
  for (const entity of entities) {
    for (const label of entity.labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
  }

  // Good: counts each label once per entity
  for (const entity of entities) {
    const uniqueLabels = new Set(entity.labels);
    for (const label of uniqueLabels) {
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  ```

### Guarding Against Unconditional Disk Writes on Click Selections

- **Issue**: Triggering persistent database, vault, or local file-system writes (e.g., `vault.saveMaps()`) on interaction click handlers (like selecting an element or map pin) when no layout, coordinate, or metadata changes have actually occurred. This causes massive I/O performance bottlenecks.
- **Pattern**: Gate persistence writes to only occur if structural data, coordinates, or core state have actually mutated. Ensure click selection handlers purely modify transient interactive UI state.
- **Example**:

  ```typescript
  // Bad: saves every time a pin is selected/clicked
  function handlePinClick(pinId) {
    interactions.selectedPinId = pinId;
    saveMapLayout(); // Redundant write!
  }

  // Good: separates selection (UI-only) from dragging (persistence-necessary)
  function handlePinClick(pinId) {
    interactions.selectedPinId = pinId;
  }
  function handlePinDragEnd(pinId, newCoords) {
    updatePinCoords(pinId, newCoords);
    saveMapLayout(); // Saved only on actual mutation
  }
  ```

### Persisted Schema and Migration Compatibility

- **Issue**: Adding a stored field, changing its meaning, or assuming a new record shape can make
  existing local-first vaults unreadable or silently rewrite user data.
- **Pattern**: Keep readers compatible with absent/legacy fields, add an explicit migration when a
  transformation is necessary, and preserve unknown data unless a deliberate migration removes it.
  Test a legacy document, the new document, and an invalid document before changing persistence.

### Persistence That Resolves `false`

- **Issue**: A store assigns new state, then awaits the save, and rolls back only in `catch`. The
  production save path (`vault.saveMaps` → `mapRegistry.saveMaps`) reports a disk-write failure by
  **resolving `false`**, so the rollback never runs and the change disappears on reload
  (PR #4152, three rounds).
- **Pattern**: Read the real adapter's return contract before writing rollback logic. Treat both a
  rejection and a falsy result as failure, and test both. A test that only rejects the mock does not
  cover the production failure.

### Multi-Step Writes Need a Rollback Plan

- **Issue**: Create an entity, then pin it, then connect it, then mark the draft saved. If a later
  step fails (the active map changed during the await, the save resolves `false`), the earlier
  steps remain: an orphan entity, and a retry creates a second copy (PR #4152).
- **Pattern**: For each step, state what happens to the previous steps if it fails. Either undo
  them, or make the operation idempotent so a retry reuses what exists. Keep the draft pending
  until the last step succeeds, and assert that in the failure test.

### Merging Ids Remaps Every Reference

- **Issue**: De-duplicating NPCs remapped `scene.npcIds` and `antagonistId`, but not
  `whereabouts[].who` or `thread.about`, which left ghost references; deduping threads before the
  remap missed duplicates that only become equal after it (PR #4122).
- **Pattern**: When ids are merged or renamed, grep the type for every field that holds that id
  kind, remap all of them, then run any dedupe that depends on the remapped values.

### Viewport Work Scales With Zoom, Not Only Record Count

- **Issue**: An overlay that culls to the viewport still enumerates every coordinate in the
  inverse-projected bounds. At the supported minimum zoom (0.1) and grid size (5px), that is
  millions of candidates per pan or zoom frame (PR #4152, four rounds). A hard cap added as the fix
  then silently hid markers past item 2,000.
- **Pattern**: Compute the worst case from the supported settings (min zoom, min cell size, a
  large viewport), not a typical map. Iterate whichever is smaller (records or visible cells), and
  degrade visibly (aggregate, hide a layer with a notice) rather than silently truncating.

### Canvas 2D Hot-Path Compositing & 60 FPS Budgets

- **Issue**: In continuous interactive animation, panning, or zooming loops (such as Cytoscape overlay canvas, map renderers, or `requestAnimationFrame` loops), allocating offscreen buffers, performing per-entity full-canvas clears (`ctx.clearRect(0, 0, w, h)`), or repeatedly blitting whole bitmaps (`ctx.drawImage`) exhausts the 16.6ms frame budget (e.g. 24 hulls doing full-canvas clear + drawImage = 48 full-canvas compositing passes _per animation frame_ on high-DPI displays), inducing severe frame drops and jank.
- **Pattern**: Composite directly onto the target viewport canvas in a single draw pass, or strictly constrain clears and copies to tight local bounding boxes (`dirtyRect`). Never perform full-viewport canvas clearing or intermediate canvas blits inside a loop over individual graph entities.

## JavaScript & HTML Best Practices

### Coordinate Check Nullish Coalescing (Falsy 0)

- **Issue**: Using logical OR (`||`) for coordinate fallbacks (e.g., `rect.left || fallback`) causes bugs when coordinates are exactly `0` (which is a valid position flush with the screen edge but is falsy in JS).
- **Pattern**: Always use nullish coalescing (`??`) for coordinate or numeric fallbacks.
- **Example**:

  ```typescript
  // Bad
  const left = rect.left || 100; // Evaluates to 100 if left is 0

  // Good
  const left = rect.left ?? 100; // Evaluates to 0 if left is 0
  ```

### Dynamic Imports with Exit Transitions

- **Issue**: Dynamically importing a component inside Svelte's `{#await}` block on-demand saves bundle size but breaks exit transitions if the wrapping conditional unmounts it immediately.
- **Pattern**: Use a sticky boolean flag (e.g., `hasOpened = true` on first interaction) that triggers the dynamic import, and keep the flag `true` to ensure the component remains in the DOM for exit animations to play.
- **Example**:

  ```svelte
  <script>
    let hasOpened = $state(false);
  </script>

  {#if hasOpened}
    {#await import("./LazyComponent.svelte") then { default: LazyComponent }}
      <LazyComponent ... />
    {/await}
  {/if}
  ```

### User-Agent Sniffing vs Environment Flags

- **Issue**: Checking `navigator.userAgent` (e.g., looking for "jsdom") to detect a testing/jsdom environment is fragile and easily breaks in different browser/node runtimes.
- **Pattern**: Use a capability check or the framework's explicit environment helpers (for example
  `browser` from `$app/environment`) instead of fragile user-agent parsing. Keep test-only behavior
  injected or explicitly configured rather than inferred from the runtime.

### Explicit Button Types

- **Issue**: `<button>` tags without a `type` attribute default to `type="submit"` in HTML, which can cause unwanted form submissions or page reloads when clicked.
- **Pattern**: Always add an explicit `type="button"` attribute to trigger/action buttons.
  ```svelte
  <button type="button" onclick={openLightbox}>Zoom</button>
  ```

## Content Accuracy

### User-Facing Content Must Match Code Reality

- **Issue**: Help guides, answers, `/for` packs, discovery entries and `llms-full.txt` describe a
  feature, settings path, importer, "automatic" behaviour or offline capability that the app does
  not expose (PR #4137: ToV profile selection, character JSON import, automatic Luck reset on Long
  Rest, "entirely offline" while ToV generator mechanics need AI). Each review round then finds the
  same claim in another file.
- **Pattern**: For every capability claim in changed content, find the code path that delivers it
  (UI entry point and a real caller, not just an engine function or test). If none exists, remove
  or soften the claim to the manual or variant-dependent reality. Then grep the whole repo for the
  claim's key phrases (including generated copies such as `llms-full.txt`) and fix every
  occurrence in one pass. Add a regression assertion for each changed article, not only the main one.

  Also check help copy for interaction claims ("click again to close") against the handler
  (PR #4143: `openJournal()` is idempotent and never closes).

- **Privacy claims**: Copy about what is hidden from players must name the mechanism the exporter
  actually checks (drafts, the `hidden` label, vault default visibility), not labels it ignores
  ("GM-only", "private"), or a reader publishes what they think is excluded (PR #4164).

### Unsupported Numbers and Rules Claims

- **Issue**: Answer and help copy invents figures ("a five-minute loop", "half an hour of focused
  looking") or states game rules from memory ("Legendary Actions trigger automatically",
  "spell circles" for ToV spell sources). The add-answer guidance forbids invented time costs, and
  rules claims were wrong against the official text (PRs #4107, #4169, #4172; the five-minute claim
  survived one fix in another sentence).
- **Pattern**: Grep changed content for numbers with units of time or effort and remove any without
  a source. For each rules statement, check the publisher's own text (SRD, Kobold Press) and cite
  it in the PR. After removing a claim, grep for its other phrasings in the same file.

### Content Edits Break Exact-String Tests

- **Issue**: Registry tests assert exact sentences from answers; rewording a checklist item fails
  CI (PR #4109). Conversely, a rewrite that drops a required block (the `kind: "checklist"` section)
  passes because nothing asserts it (PRs #4102, #4107).
- **Pattern**: Run `test:changed` for content PRs and grep tests for the old sentence before
  rewording. When content adds or keeps a required structure (checklist, comparison table, worked
  example), assert it for that slug.

### Evergreen Blog Posts Are Discovery Pages

- **Issue**: An evergreen guide under `apps/web/src/lib/content/blog/` with search keywords shipped
  without a discovery-registry entry or `GOVERNED_BLOG_PATHS` update (PRs #4182, #4183).
- **Pattern**: Apply Constitution XIII to evergreen posts exactly as to `/answers` pages: check
  `findIntentOwner`, register the intent, and run `bun scripts/discovery-audit.mjs`.

### Answer Mesh Reciprocity

- **Issue**: A new answer links to existing answers whose `relatedAnswers` do not link back. The
  same applies to `acknowledgedOverlap`: an overlap acknowledged on one side only is incomplete
  (PR #4104).
- **Pattern**: Run `bun run check:answer-mesh` and `bun scripts/discovery-audit.mjs`; both also run
  from `lint-changed` when content files change. Add the reciprocal slug to each linked answer,
  and the reciprocal overlap acknowledgement to each overlapping entry.

### PR Description and Reports Match the Net Diff

- **Issue**: A later commit reverted the extraction the PR title describes, so the net diff was a
  lockfile and a report; the report also quoted a line count that the PR itself changed (PR #4181).
- **Pattern**: Before handoff, read `git diff origin/staging...HEAD --stat` against the PR
  description. Regenerate any figures (line counts, rankings) from the head commit.

## Review Evidence

### Tests Follow the Failure Mode

- **Issue**: A review accepts an implementation based on a happy-path test even though the changed
  boundary is cancellation, invalid input, permission, persistence, or cleanup.
- **Pattern**: Match validation to the risk: add a focused regression test for the bug or boundary,
  including a meaningful failure, cancellation, or negative path when applicable. Run changed-file
  lint and tests plus the affected workspace type-check; do not substitute a broad baseline run for
  understanding the changed behaviour.

### Findings Must Be Actionable

- **Issue**: A broad warning such as "consider accessibility" or "this might race" sends work to the
  author without proving a defect.
- **Pattern**: Report only a changed-code defect with its location, reproduction or failure mode,
  user impact, and a concrete remediation. If the evidence is insufficient, record the uncertainty
  as a validation gap rather than presenting it as a bug.

### Adversarial Premise Inversion in Optimizations

- **Issue**: A performance optimization or algorithmic simplification relies on a premise that holds in typical or large-scale usage but fails at the boundaries (e.g., "calculating bounding boxes for every label is slow on fit-bounds, and labels aren't visible when zoomed far out anyway, so measure only node extents"—which completely clips labels and curved/self-loop edges in small or sparse graphs of 2–3 nodes where `zoom >= 0.5` and labels _are_ visible).
- **Pattern**: Actively test the inverse of the author's optimization premise. Ask: "Under what input scale, viewport size, coordinate distribution, or user interaction is this premise false?" Verify edge conditions with focused unit tests.

### Assertion Completeness (Not Just "Tests Pass")

- **Issue**: A PR introduces new configuration keys (e.g. `graphShowCommunities` in persisted settings), environment flags, or async debounce timers (`SHARPEN_DELAY_MS`), and existing test suites pass with hundreds of green tests, but the _newly added_ keys, timers, or error branches are completely unasserted in the test suite. Passing test counts create a false sense of security.
- **Pattern**: Audit tests specifically for the newly introduced code branches and keys:
  1. Does every new settings/persisted property have an assertion verifying its load, save, and default fallback values?
  2. Does every new async timer have fake-timer assertions (`vi.useFakeTimers()`) exercising cancellation, re-triggering, and tick execution?
  3. Does every error branch or negative condition have an explicit test expecting the error or fallback?

### The Revert Check: Would Any Test Fail?

`tests` is Luna's largest finding category (about a quarter of all findings). Almost every one is
the same question: "if this changed line were reverted, would a test fail?" Ask it for each hunk
and name the test. These are the recurring ways the answer is "no" while the suite is green:

- **The seam skips the production default.** Every test injects `StorageLike`,
  `formatterExecutable` or a clock, so the default wiring (`browserStorage`, `"bunx"`) is never
  exercised; reverting the default to `npx` stays green (PRs #4100, #4128). Add one test that uses
  the default.
- **The test supplies the fix.** A test passes its own `updateSelection` callback that already
  does the right thing, while the bug and the fix live in the route callback (PR #4168, three
  rounds). Drive the real caller.
- **The asserted text appears anyway.** Asserting the merge prompt contains a branch title passes
  without route history because the whole plan is also in the prompt (PR #4127). Assert something
  only the changed code can produce.
- **The values do not discriminate.** A timeout test that advances to 120,001 ms passes whether
  the limit is 60s or 120s (PR #4114). Pick a value between the old and new behaviour.
- **One of N.** The PR adds four legacy aliases, three buttons, two help articles, or a whole
  category map; the test checks one (PRs #4126, #4173, #4137, #4181). Use `it.each` over all of them.
- **The wrong failure shape.** The mock rejects, but production resolves `false` (PR #4152).
- **The branch is unreached.** The test never hits the new branch (anchor cleared when deleted,
  confirm resolved `false`, `cancelledIds` present) (PR #4168).
- **Content and presentation count.** Changed rules text, new copy, responsive classes, icons and
  hover tokens are behaviour for this repo's reviewer; a PR that changes them adds an assertion
  for them (PRs #4150, #4157, #4169, #4177).
- **Changed logic with no new test.** A performance refactor of selection loops still needs a test
  that pins which items are selected (PR #4156).
