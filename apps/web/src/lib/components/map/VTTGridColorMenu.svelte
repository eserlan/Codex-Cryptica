<script lang="ts">
  import { mapStore } from "$lib/stores/map.svelte";
  import { vttModeMenu } from "./vtt-mode-menu.svelte";

  const gridColors = [
    { value: "#ffffff", label: "White" },
    { value: "#000000", label: "Black" },
    { value: "#fbbf24", label: "Amber" },
    { value: "#3b82f6", label: "Blue" },
  ];

  function closeMenu() {
    vttModeMenu.close();
  }

  function setGridColor(color: string | null) {
    mapStore.gridColor = color;
    closeMenu();
  }

  $effect(() => {
    if (!vttModeMenu.isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        (event.target as HTMLElement | null)?.closest?.(
          '[data-testid="vtt-grid-color-menu"]',
        )
      ) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

{#if vttModeMenu.isOpen}
  <div
    data-testid="vtt-grid-color-menu"
    role="menu"
    tabindex={0}
    aria-label="Grid color menu"
    class="fixed z-[140] min-w-44 rounded-xl border border-theme-border bg-theme-surface/95 backdrop-blur shadow-2xl p-3"
    style:left={`${vttModeMenu.position.x}px`}
    style:top={`${vttModeMenu.position.y}px`}
    oncontextmenu={(event) => event.preventDefault()}
  >
    <div class="mb-2">
      <div
        class="text-[9px] font-bold uppercase tracking-widest text-theme-muted"
      >
        Grid Color
      </div>
      <div class="text-[10px] text-theme-muted/80 mt-1">
        Right-click menu for the VTT toggle.
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      {#each gridColors as color (color.value)}
        <button
          role="menuitem"
          class="flex items-center gap-2 rounded-md border border-theme-border bg-theme-bg/60 px-2.5 py-2 text-left text-xs text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary/10"
          onclick={() => setGridColor(color.value)}
          aria-label={`Set grid color to ${color.label}`}
        >
          <span
            class="h-4 w-4 rounded-full border border-theme-border"
            style:background-color={color.value}
          ></span>
          <span class="font-semibold">{color.label}</span>
        </button>
      {/each}
    </div>

    <div class="mt-3 pt-3 border-t border-theme-border/50">
      <button
        role="menuitem"
        class="w-full rounded-md border border-theme-border bg-theme-bg/60 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-theme-muted transition-all hover:text-theme-primary hover:border-theme-primary hover:bg-theme-primary/10"
        onclick={() => setGridColor(null)}
      >
        Theme Default
      </button>
    </div>
  </div>
{/if}
