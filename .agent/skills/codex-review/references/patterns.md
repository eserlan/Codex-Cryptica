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

## Trust, Privacy & Public Boundaries

### Untrusted Markdown and HTML

- **Issue**: Rendering imported, generated, or remote text through `{@html}` without sanitizing it
  creates an XSS boundary.
- **Pattern**: Use the existing `renderMarkdown` utility, which sanitizes output with DOMPurify, or
  use a deliberately allowlisted structured renderer. Never add a raw `{@html value}` path for
  user, AI, import, or network content.

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
  updateCoordinates(currentX, currentY);
  ```

### Visually Hidden Transition Elements & Accessibility Trees

- **Issue**: Elements that use Tailwind transition classes (like `opacity-0`, `scale-95`, or `pointer-events-none`) to fade out or animate away are still present in the DOM. Even when fully invisible to sighted users, they remain visible to assistive technologies (screen readers, keyboard focus tabs, etc.), resulting in an inaccessible experience.
- **Pattern**: Dynamically apply `aria-hidden="true"` or `inert` to transition elements, modal overlays, or backdrops when their visibility state is closed or hidden, or conditionally unmount them entirely if Svelte transitions are used instead.

### Custom Dialog Focus and Keyboard Lifecycle

- **Issue**: A custom modal that only looks like a dialog can leave focus behind the overlay, trap it
  nowhere, or fail to restore it when closed.
- **Pattern**: Prefer the existing dialog/modal primitives. If a custom dialog is necessary, provide
  an accessible name, keep focus inside while open, support Escape when dismissal is allowed, and
  restore focus to the triggering control. Verify keyboard-only navigation.

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
