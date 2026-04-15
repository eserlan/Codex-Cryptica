# Component Pattern: Buttons

Codex-Cryptica uses standard HTML `<button>` elements styled with Tailwind 4 utility classes. Button patterns should remain theme agnostic: the base guidance covers structure, emphasis, spacing, and state treatment, while the active theme is applied through semantic tokens.

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
3.  **Typography**: Most buttons should use a compact, high-contrast label treatment such as `text-xs font-bold uppercase tracking-widest` when the action needs strong visual emphasis.
4.  **Theme Agnostic Tokens**: Prefer semantic tokens such as `theme-primary`, `theme-secondary`, `theme-border`, `theme-bg`, `theme-text`, and `theme-muted` so button markup does not need to change across themes.

## Applying the Current Theme

The current default theme is Fantasy, but the button pattern itself should not depend on Fantasy-specific terminology or hardcoded decorative colors. The active theme should be expressed by the token values supplied in the theme layer.

For the current Fantasy theme, that means:

1.  **Primary Actions**: `bg-theme-primary`, `border-theme-primary`, and `text-theme-bg` resolve to the current Fantasy action palette.
2.  **Secondary Actions**: `bg-theme-bg/50`, `border-theme-border`, and `text-theme-muted` inherit the current Fantasy surface and text treatment.
3.  **Hover and Glow**: `hover:bg-theme-secondary` and token-derived shadow treatments pick up the current Fantasy accenting automatically.
4.  **Danger Actions**: Hardcoded destructive colors remain an exception unless and until the design system defines semantic danger tokens for all button states.
