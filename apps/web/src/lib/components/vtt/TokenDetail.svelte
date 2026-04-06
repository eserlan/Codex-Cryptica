<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { guestRoster } from "$lib/stores/guest";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  const selectedToken = $derived(mapSession.selectedToken);
  const linkedEntity = $derived.by(() => {
    if (!selectedToken?.entityId) return null;
    return vault.entities[selectedToken.entityId] || null;
  });
  const canManageToken = $derived(mapStore.isGMMode && !uiStore.isGuestMode);
  const guests = $derived.by(() =>
    Object.values($guestRoster).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    ),
  );
</script>

{#if selectedToken}
  <aside
    class="w-full max-w-sm rounded-xl border border-theme-border bg-theme-surface/95 backdrop-blur shadow-xl p-4 space-y-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3
          class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
        >
          {selectedToken.name}
        </h3>
        <p class="text-[10px] text-theme-muted mt-1">
          {selectedToken.width} x {selectedToken.height} units
        </p>
      </div>
      <button
        class="text-theme-muted hover:text-theme-text"
        onclick={() => mapSession.setSelection(null)}
        aria-label="Clear token selection"
      >
        <span class="icon-[lucide--x] w-4 h-4"></span>
      </button>
    </div>

    {#if linkedEntity}
      <div class="rounded-lg border border-theme-border bg-theme-bg/50 p-3">
        <div class="text-[10px] uppercase tracking-widest text-theme-muted">
          Linked Entity
        </div>
        <div class="text-sm font-bold text-theme-text">
          {linkedEntity.title}
        </div>
        <div class="text-[10px] uppercase tracking-widest text-theme-muted">
          {linkedEntity.type}
        </div>
      </div>
    {:else}
      <div
        class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 text-sm text-theme-muted"
      >
        Freeform marker
      </div>
    {/if}

    {#if canManageToken}
      <label class="space-y-2 block">
        <span
          class="text-[10px] uppercase tracking-widest font-bold text-theme-muted"
          >Owner</span
        >
        <select
          class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
          value={selectedToken.ownerPeerId ?? ""}
          onchange={(e) => {
            const next = e.currentTarget.value || null;
            mapSession.setTokenOwner(selectedToken.id, next);
          }}
        >
          <option value="">Unassigned</option>
          {#each guests as guest (guest.peerId)}
            <option value={guest.peerId}
              >{guest.displayName} ({guest.peerId})</option
            >
          {/each}
        </select>
        <p class="text-[10px] text-theme-muted">
          Guests can move only tokens assigned to their peer id.
        </p>
      </label>

      <div class="flex gap-2">
        <button
          class="flex-1 px-3 py-2 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
          onclick={() => mapSession.addToInitiative(selectedToken.id)}
        >
          Add to Initiative
        </button>
        <button
          class="flex-1 px-3 py-2 rounded-lg border border-red-500/40 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200"
          onclick={() => mapSession.removeToken(selectedToken.id)}
        >
          Remove Token
        </button>
      </div>
    {:else}
      <div
        class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 text-[10px] uppercase tracking-widest text-theme-muted"
      >
        Read-only view for guests
      </div>
    {/if}
  </aside>
{/if}
