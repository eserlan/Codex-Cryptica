# Quickstart: Svelte-Native Sync Engine ("The Pulse")

## Prerequisites

- Svelte 5 Environment
- Modern Browser with OPFS support (Chrome/Edge/Firefox)

## 1. Initialization

In your root layout (`+layout.svelte`), the `VaultStore` is initialized automatically. No user interaction is required to open the default vault.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { vault } from '$lib/stores/vault';

  onMount(async () => {
    // The vault now initializes itself automatically using OPFS.
    await vault.init();
  });
</script>
```

## 2. Using the Graph

Connect the derived graph store to your Cytoscape component.

```svelte
<script lang="ts">
  import { graph } from '$lib/stores/graph';
  import Cytoscape from 'cytoscape';

  let container: HTMLElement;
  let cy: Cytoscape.Core;

  // React to graph changes
  $effect(() => {
    if (cy && $graph.elements) {
      cy.json({ elements: $graph.elements });
      cy.layout({ name: 'cose' }).run();
    }
  });

  onMount(() => {
    cy = Cytoscape({ container });
  });
</script>

<div bind:this={container} class="w-full h-full" />
```

## 3. Editing Content

Updates to the vault automatically propagate to the graph.

```svelte
<script lang="ts">
  import { vault } from '$lib/stores/vault';

  function updateTitle(id: string, newTitle: string) {
    vault.updateEntity(id, { title: newTitle });
    // -> Updates Store -> Triggers Derived Graph -> Writes to File (Debounced)
  }
</script>
```
