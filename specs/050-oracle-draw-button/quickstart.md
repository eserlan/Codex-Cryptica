# Quickstart: Implementing the Draw Button

## 1. Update OracleStore

Add the new draw methods to `apps/web/src/lib/stores/oracle.svelte.ts`. Ensure they leverage `aiService.retrieveContext` with the `isImage` flag set to `true` to trigger style guide lookups.

```typescript
async drawEntity(entityId: string) {
  // 1. Get entity and lore
  // 2. retrieveContext(lore, ..., isImage: true)
  // 3. distillVisualPrompt(...)
  // 4. generateImage(...)
  // 5. vault.saveImageToVault(...)
}
```

## 2. Integrate into UI

Use the `oracle.tier` rune to conditionally show the button.

### Chat Message

In `ChatMessage.svelte`, add the button to the actions row for assistant messages.

### Sidepanel / Zen Mode

In `DetailImage.svelte` and `ZenModeModal.svelte`, add the button when `!entity.image`.

```svelte
{#if oracle.tier === "advanced" && !entity.image}
  <button onclick={() => oracle.drawEntity(entity.id)}> DRAW </button>
{/if}
```

## 3. Style Feedback

Listen for `styleCache` updates in `AIService` or derive the "Active Style" from the vault to show a tooltip like "Adhering to: Grimdark Oil Painting style".
