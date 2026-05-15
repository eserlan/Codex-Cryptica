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
