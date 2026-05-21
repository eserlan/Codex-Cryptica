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
