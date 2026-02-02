<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
</script>

{#if graph.orbitMode}
  <div class="orbit-controls">
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
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    z-index: 100;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .orbit-status {
      font-size: 0.9rem;
      font-weight: 500;
  }
</style>
