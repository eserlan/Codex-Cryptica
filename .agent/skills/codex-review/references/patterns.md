# Codex Review Patterns

This reference documents specific anti-patterns and quality standards for the Codex-Cryptica project.

## Svelte 5 & Reactivity

### Race Conditions in Async Handlers

- **Issue**: Multiple clicks on a "Commit" or "Save" button triggering multiple async operations.
- **Pattern**: Always use an `isCommitting` or `isLoading` guard.
- **Example**:

```svelte
<script>
  let isCommitting = $state(false);
  async function handleCommit() {
    if (isCommitting) return; // REQUIRED
    isCommitting = true;
    try { ... } finally { isCommitting = false; }
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
- **Pattern**: Never reference Svelte runes or compiler instructions inside Web Worker scripts or files transitively imported by them. Use a fully environment-agnostic, standard JS deep clone mechanism (such as standard browser `structuredClone` with fallback) on the main thread before passing parameters to Web Worker boundaries, and verify the output using the static analyzer script `node scripts/check-compiled-runes.js` integrated into the build process.

## Oracle & AI Logic

### Aggressive Regex Parsing

- **Issue**: Commands like `/create "Name"` matching even when extra text is provided, causing AI context loss.
- **Pattern**: Use strict regex with line endings (`\s*$`) for deterministic commands.
- **Check**: Does the regex in `oracle-parser.ts` allow for "fall through" to AI when extra description is present?

### Web Worker Proxy Binding

- **Issue**: Calling methods on the `OracleWorker` proxy that aren't exposed in the `OracleWorker` class.
- **Pattern**: Every AI generation method in `TextGenerationService` must have a corresponding wrapper in `oracle.worker.ts`.

### Batch Processing Heuristics

- **Issue**: Massive batch AI reconciliation slowing down the UI.
- **Pattern**: Limit synchronous AI reconciliation in loops (e.g., `< 5` entities).

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
- **Pattern**: Check both the updated status field and the patch/event payload to cleanly capture transition states (e.g. `patch.status === 'active' && entity.status === 'active'`).

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
- **Pattern**: Use explicit environment flags like `import.meta.env.MODE === "test"` (Vite/Vitest) or feature checks instead of fragile user-agent parsing.

### Explicit Button Types

- **Issue**: `<button>` tags without a `type` attribute default to `type="submit"` in HTML, which can cause unwanted form submissions or page reloads when clicked.
- **Pattern**: Always add an explicit `type="button"` attribute to trigger/action buttons.
  ```html
  <button type="button" onclick="{openLightbox}">Zoom</button>
  ```
