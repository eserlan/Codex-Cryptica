# Quickstart: Svelte-Native Sync Engine ("The Pulse")

## Prerequisites
*   Svelte 5 Environment
*   Browser with File System Access API support (Chrome/Edge/Desktop Safari)

## 1. Initialization
In your root layout (`+layout.svelte`), mount the Vault provider.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { vault } from '$lib/stores/vault';
  
  onMount(async () => {
    // Ideally, check for a stored handle in IndexedDB to auto-reopen
    // For now, we wait for user interaction
  });
</script>

<button onclick={() => vault.openDirectory()}>
  Open Vault
</button>
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
