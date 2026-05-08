# Component Pattern: Inputs

Inputs in Codex-Cryptica should be documented and implemented as theme-agnostic components. The base pattern defines structure, spacing, states, and token usage without assuming a specific visual theme.

## Standard Text Input

Used for single-line text entry.

### Usage

```svelte
<div class="space-y-2">
  <label for="search-input" class="text-sm font-medium text-theme-text">
    Search Codex
  </label>
  <input
    id="search-input"
    type="text"
    placeholder="Search entities..."
    bind:value={_searchQuery}
    class="w-full rounded-lg border border-theme-border bg-theme-bg/50 px-4 py-2 text-sm text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
  />
</div>
```

## Textarea

Used for multi-line content such as entity descriptions or lore.

### Usage

```svelte
<div class="space-y-2">
  <label for="entity-description" class="text-sm font-medium text-theme-text">
    Description
  </label>
  <textarea
    id="entity-description"
    bind:value={_content}
    placeholder="Describe the entity..."
    rows="4"
    class="w-full rounded-lg border border-theme-border bg-theme-bg/50 px-4 py-3 text-sm leading-relaxed text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20 custom-scrollbar"
  ></textarea>
</div>
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
4.  **Theme Agnostic Tokens**: Use semantic tokens such as `theme-bg`, `theme-border`, `theme-text`, `theme-muted`, and `theme-accent` so the component can inherit any active theme without changing its markup.

## Applying the Current Theme

The current default theme is Fantasy, but the input pattern itself should not be rewritten around Fantasy-specific colors or materials. Instead, the active theme is applied by mapping semantic tokens to Fantasy values in the theme layer.

For the current Fantasy theme, that means:

1.  **Surface**: `bg-theme-bg/50` resolves to the Fantasy surface treatment.
2.  **Borders and Text**: `border-theme-border`, `text-theme-text`, and `placeholder-theme-muted` inherit the Fantasy palette.
3.  **Focus**: `focus:border-theme-accent` and `focus:ring-theme-accent/20` pick up the Fantasy accent treatment automatically.
4.  **Future Themes**: New themes should override the same semantic tokens rather than requiring input-specific class changes.
