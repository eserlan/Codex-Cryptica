# Quickstart: Connections Proposer

## 1. Initialize Proposer Store

Add the proposer initialization to `+layout.svelte` or the main store init chain.

```typescript
import { proposerStore } from "$lib/stores/proposer.svelte";

onMount(() => {
  proposerStore.init();
});
```

## 2. Integrate with Entity Detail Panel

Include the new `DetailProposals` component in the sidebar view.

```svelte
<script>
  import DetailProposals from "./entity-detail/DetailProposals.svelte";
  let { entity } = $props();
</script>

{#if entity}
  <DetailProposals {entity} />
{/if}
```

## 3. Worker Configuration

Ensure the `ProposerWorker` is registered in the build config to enable non-blocking background scans.
