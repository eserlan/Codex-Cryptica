<script lang="ts">
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { vttModeMenu } from "./vtt-mode-menu.svelte";

  let toggleEl = $state<HTMLButtonElement | null>(null);

  function toggleVtt() {
    mapSession.setVttEnabled(!mapSession.vttEnabled);
  }

  function openMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const anchor = toggleEl?.getBoundingClientRect();
    const x = anchor ? anchor.left : event.clientX;
    const y = anchor ? anchor.top - 236 : event.clientY;
    vttModeMenu.openAt({
      x: Math.max(12, x),
      y: Math.max(12, y),
    });
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 2) return;
    openMenu(event);
  }
</script>

<div class="relative">
  <button
    bind:this={toggleEl}
    class="px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all {mapSession.vttEnabled
      ? 'bg-theme-primary/20 text-theme-primary border border-theme-primary/50'
      : 'text-theme-muted hover:text-theme-text'}"
    onclick={toggleVtt}
    onmousedown={handleMouseDown}
    oncontextmenu={(event) => event.preventDefault()}
    title={mapSession.vttEnabled ? "Disable VTT mode" : "Enable VTT mode"}
    aria-pressed={mapSession.vttEnabled}
    aria-haspopup="menu"
    aria-expanded={vttModeMenu.isOpen}
    aria-label="Toggle VTT mode"
  >
    VTT {mapSession.vttEnabled ? "ON" : "OFF"}
  </button>
</div>
