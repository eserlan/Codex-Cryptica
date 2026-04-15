# Component Pattern: Inputs

Inputs in Codex-Cryptica are designed to be tactile and theme-aware, utilizing the "Fantasy" theme's parchment and ink aesthetics.

## Standard Text Input

Used for single-line text entry.

### Usage

```svelte
<input
  type="text"
  placeholder="Search entities..."
  bind:value={_searchQuery}
  class="w-full rounded-lg border border-theme-border bg-theme-bg/50 px-4 py-2 text-sm text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
/>
```

## Textarea

Used for multi-line content such as entity descriptions or lore.

### Usage

```svelte
<textarea
  bind:value={_content}
  placeholder="Describe the entity..."
  rows="4"
  class="w-full rounded-lg border border-theme-border bg-theme-bg/50 px-4 py-3 text-sm leading-relaxed text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20 custom-scrollbar"
></textarea>
```

## Checkboxes and Toggles

For boolean settings.

### Usage

```svelte
<label class="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    bind:checked={_isEnabled}
    class="h-4 w-4 rounded border-theme-border bg-theme-bg/50 text-theme-primary focus:ring-theme-accent"
  />
  <span class="text-sm text-theme-text">Enable feature</span>
</label>
```

## Guidelines

1.  **Binding**: Use Svelte's `bind:value` or `bind:checked` for reactive data synchronization.
2.  **Focus States**: Always ensure a visible focus state using `focus:border-theme-accent` and a subtle ring.
3.  **Scrollbars**: For textareas, use the `.custom-scrollbar` utility class defined in `app.css`.
