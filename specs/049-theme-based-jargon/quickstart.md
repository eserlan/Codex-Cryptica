# Quickstart: Using Theme-Based Jargon

## Defining Jargon in a Theme

Add the `jargon` property to any theme in `packages/schema/src/theme.ts`:

```typescript
fantasy: {
  id: "fantasy",
  name: "Ancient Parchment",
  tokens: { ... },
  jargon: {
    vault: "Archive",
    entity: "Chronicle",
    entity_plural: "Chronicles",
    save: "Inscribe",
    new: "Forge",
    syncing: "Preserving"
  }
}
```

## Consuming Jargon in UI

Use the `themeStore` to resolve atmospheric terms in your Svelte components:

```svelte
<script>
  import { themeStore } from "$lib/stores/theme.svelte";

  // Resolve a simple action
  const saveLabel = $derived(themeStore.jargon.save); // "Inscribe" or "Save"

  // Resolve with pluralization (if helper is implemented)
  const vaultLabel = $derived(themeStore.resolveJargon("entity", count));
</script>

<h1>{vaultLabel}</h1>
<button>{saveLabel}</button>
```
