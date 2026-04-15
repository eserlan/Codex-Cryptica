# Component Pattern: Buttons

Codex-Cryptica uses standard HTML `<button>` elements styled with Tailwind 4 utility classes. This ensures maximum flexibility while maintaining a consistent visual language.

## Primary Button

The primary action button uses the project's brand color and is typically used for positive actions (Confirm, Save, Create).

### Usage

```svelte
<button
  class="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)]"
  onclick={() => _handleAction()}
>
  Primary Action
</button>
```

## Secondary / Cancel Button

Used for neutral or dismissive actions.

### Usage

```svelte
<button
  class="rounded-xl border border-theme-border bg-theme-bg/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text"
  onclick={() => _handleCancel()}
>
  Cancel
</button>
```

## Danger Button

Used for destructive actions (Delete, Remove).

### Usage

```svelte
<button
  class="rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all bg-red-600 text-white border border-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.25)]"
  onclick={() => _handleDelete()}
>
  Delete Entity
</button>
```

## Guidelines

1.  **Svelte 5 Events**: Always use the `onclick` attribute instead of the deprecated `on:click`.
2.  **Transitions**: Use `transition-all` to ensure smooth hover and active states.
3.  **Typography**: Most buttons should use `text-xs font-bold uppercase tracking-widest` for a "game-like" UI feel.
