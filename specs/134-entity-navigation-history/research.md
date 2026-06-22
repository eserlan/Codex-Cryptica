# Research: Entity Navigation History

## Best Practices for Svelte 5 History Management

- **Decision**: Implement a custom Svelte 5 Rune store (`NavigationHistoryStore`) using the constructor DI pattern established in the codebase.
- **Rationale**: Relying purely on SvelteKit routing might mix entity history with global app history (settings, etc). A custom rune store tracking `past` and `future` stacks specifically for entity IDs allows strict control (50 item limit, avoiding consecutive duplicates).
- **Alternatives considered**: SvelteKit's native history API (rejected because it doesn't easily allow filtering just entity navigations or enforcing a strict 50-item limit specific to entities without complex `beforeNavigate` logic).

## Shortcut Interception

- **Decision**: Use a global `<svelte:window onkeydown={...}>` listener, checking `document.activeElement` to ignore events from inputs, textareas, and contenteditables. Also check modal state to disable navigation unless the modal is Zen Mode.
- **Rationale**: Simplest and most robust way to handle global shortcuts in Svelte.
- **Alternatives considered**: Keybinding libraries (rejected due to YAGNI).
