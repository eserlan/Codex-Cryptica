<script lang="ts">
  import { guestRoster } from "$lib/stores/guest";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { fade, slide } from "svelte/transition";

  const guests = $derived(Object.values($guestRoster));
  const hasGuests = $derived(guests.length > 0);
</script>

{#if mapSession.vttEnabled && hasGuests}
  <div
    class="bg-theme-surface/90 backdrop-blur-md border border-theme-border rounded-lg shadow-2xl p-4 pointer-events-auto min-w-[180px] max-w-[240px]"
    transition:fade={{ duration: 300 }}
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between mb-3 pb-2 border-b border-theme-border/30"
    >
      <div class="flex items-center gap-2">
        <span class="icon-[lucide--users] w-3.5 h-3.5 text-theme-primary"
        ></span>
        <span
          class="text-[10px] font-bold uppercase tracking-[0.2em] font-header text-theme-text"
          >Joined Players</span
        >
      </div>
      <div
        class="flex h-4 w-4 items-center justify-center rounded-full bg-theme-primary/20"
      >
        <span class="text-[9px] text-theme-primary font-bold"
          >{guests.length}</span
        >
      </div>
    </div>

    <!-- List -->
    <div class="space-y-2.5 max-h-[300px] overflow-y-auto no-scrollbar">
      {#each guests as guest (guest.peerId)}
        <div
          class="flex items-center justify-between gap-3 group"
          transition:slide={{ duration: 200 }}
        >
          <div class="flex items-center gap-2 overflow-hidden">
            <div class="relative">
              <div
                class="w-2 h-2 rounded-full {guest.status === 'connected'
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                  : guest.status === 'viewing'
                    ? 'bg-theme-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]'
                    : 'bg-theme-muted'}"
              ></div>
            </div>
            <span
              class="text-xs font-semibold truncate text-theme-text group-hover:text-theme-primary transition-colors"
              >{guest.displayName}</span
            >
          </div>

          <div class="shrink-0 text-right">
            {#if guest.status === "viewing" && guest.currentEntityTitle}
              <div
                class="text-[8px] text-theme-muted italic truncate max-w-[90px] leading-tight"
              >
                {guest.currentEntityTitle}
              </div>
            {:else}
              <span
                class="text-[8px] text-theme-muted uppercase tracking-wider font-bold opacity-60"
              >
                {guest.status}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
