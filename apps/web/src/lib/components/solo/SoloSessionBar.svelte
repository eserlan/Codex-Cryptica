<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import SoloQuickRoll from "./SoloQuickRoll.svelte";
  import SoloActions from "./SoloActions.svelte";
  import SoloSessionSheet from "./SoloSessionSheet.svelte";
  import SoloSceneField from "./SoloSceneField.svelte";

  const MINIMISED_KEY = "codex-solo-bar-minimised";

  function readMinimised(): boolean {
    try {
      return localStorage.getItem(MINIMISED_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeMinimised(on: boolean) {
    try {
      if (on) localStorage.setItem(MINIMISED_KEY, "1");
      else localStorage.removeItem(MINIMISED_KEY);
    } catch {
      // Keeping the preference is a convenience; the bar still works without it.
    }
  }

  let minimised = $state(readMinimised());
  let sheetOpen = $state(false);

  const visible = $derived(
    soloSessionStore.isActive && !sessionModeStore.isGuestMode,
  );
  const mapId = $derived(soloSessionStore.session?.mapId ?? null);
  const mapName = $derived(mapId ? (vault.maps?.[mapId]?.name ?? null) : null);

  function minimise(on: boolean) {
    minimised = on;
    writeMinimised(on);
  }
</script>

{#if visible}
  <div
    role="region"
    aria-label="Solo session"
    data-testid="solo-bar"
    class="flex min-w-0 shrink-0 items-center gap-3 border-b border-theme-border bg-theme-surface px-3 py-1.5"
  >
    {#if layoutUIStore.isMobile}
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-1 text-sm font-bold text-theme-primary"
        data-testid="solo-bar-mobile-trigger"
        aria-label="Open solo session tools"
        onclick={() => (sheetOpen = true)}
      >
        Solo session
      </button>
      {#if sheetOpen}
        <SoloSessionSheet onclose={() => (sheetOpen = false)} />
      {/if}
    {:else if minimised}
      <button
        type="button"
        class="rounded-md border border-theme-border px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
        data-testid="solo-bar-expand"
        aria-label="Show the solo session bar"
        aria-expanded="false"
        onclick={() => minimise(false)}
      >
        Solo session
      </button>
    {:else}
      <span
        class="shrink-0 font-header text-xs uppercase tracking-widest text-theme-muted"
      >
        {mapName ?? "No map"}
      </span>
      <SoloSceneField />
      <SoloQuickRoll />
      <div class="min-w-0 flex-1 overflow-x-auto">
        <SoloActions />
      </div>
      <button
        type="button"
        class="shrink-0 rounded-md px-2 py-1 text-theme-muted hover:text-theme-primary"
        data-testid="solo-bar-minimise"
        aria-label="Minimise the solo session bar"
        aria-expanded="true"
        onclick={() => minimise(true)}
      >
        <span
          class="icon-[lucide--chevron-up] inline-block h-4 w-4"
          aria-hidden="true"
        ></span>
      </button>
    {/if}
  </div>
{/if}
