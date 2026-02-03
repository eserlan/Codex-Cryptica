<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fade } from "svelte/transition";

  let centralEntity = $derived(graph.centralNodeId ? vault.entities[graph.centralNodeId] : null);
</script>

{#if graph.orbitMode}
  <div class="orbit-controls" transition:fade>
    {#if centralEntity}
      <div class="flex items-center gap-2">
        <span class="icon-[lucide--info] w-3 h-3 text-theme-primary"></span>
        <span class="text-xs font-bold text-white uppercase tracking-wider">{centralEntity.title}</span>
      </div>
      <div class="h-4 w-px bg-white/20 mx-1"></div>
    {/if}

    <div class="orbit-status">
      Orbit Mode Active
    </div>
    <div class="h-4 w-px bg-white/20 mx-2"></div>
    <button 
      class="text-xs font-mono uppercase hover:text-red-400 transition"
      onclick={(e) => {
        e.stopPropagation();
        graph.toggleOrbit();
      }}
      data-testid="orbit-exit-button"
    >
      [Exit View]
    </button>
  </div>
{/if}

<style>
  .orbit-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    backdrop-blur: 4px;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    z-index: 100;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  }
  
  .orbit-status {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.6);
  }
</style>
