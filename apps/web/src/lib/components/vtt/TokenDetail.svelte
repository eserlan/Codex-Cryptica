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
  const revealImagePath = $derived.by(() => {
    if (!selectedToken) return null;
    const entityImage = selectedToken.entityId
      ? vault.entities[selectedToken.entityId]?.image
      : null;
    if (entityImage) return entityImage;
    return selectedToken.imageUrl;
  });
  const isInInitiative = $derived.by(() =>
    selectedToken
      ? mapSession.initiativeOrder.includes(selectedToken.id)
      : false,
  );
</script>

{#if selectedToken}
  <aside
    class="relative z-10 w-full max-w-sm rounded-xl border border-theme-border bg-theme-surface/95 backdrop-blur shadow-xl p-4 space-y-4 pointer-events-auto"
    role="presentation"
    onmousedown={(e) => e.stopPropagation()}
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
        type="button"
      >
        <span class="icon-[lucide--x] w-4 h-4"></span>
      </button>
    </div>

    {#if canManageToken}
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
            const nextGuest =
              guests.find((guest) => guest.peerId === next) ?? null;
            mapSession.setTokenOwner(
              selectedToken.id,
              next,
              nextGuest?.displayName ?? null,
            );
          }}
        >
          <option value="">Unassigned</option>
          {#each guests as guest (guest.peerId)}
            <option value={guest.peerId}>{guest.displayName}</option>
          {/each}
        </select>
        <p class="text-[10px] text-theme-muted">
          Guests can move only tokens assigned to their peer id.
        </p>
      </label>

      <div class="flex items-stretch gap-2">
        {#if !isInInitiative}
          <button
            class="flex-1 px-3 py-2 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
            onclick={() => mapSession.addToInitiative(selectedToken.id)}
            type="button"
          >
            Add to Initiative
          </button>
        {/if}
        {#if revealImagePath}
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-theme-border text-theme-muted hover:text-theme-text hover:border-theme-primary/40 hover:bg-theme-primary/5"
            onmousedown={(e) => {
              e.stopPropagation();
              console.log("[TokenDetail] show to players mousedown", {
                tokenId: selectedToken.id,
              });
            }}
            onclick={(e) => {
              e.stopPropagation();
              console.log("[TokenDetail] show to players clicked", {
                tokenId: selectedToken.id,
                revealImagePath,
              });
              mapSession.showTokenImageToPlayers(selectedToken.id);
            }}
            type="button"
            aria-label="Show token image to players"
            title="Show token image to players"
          >
            <span class="icon-[lucide--image-up] h-4 w-4"></span>
          </button>
        {/if}
        <button
          class="flex-1 px-3 py-2 rounded-lg border border-red-500/40 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200"
          onclick={() => mapSession.removeToken(selectedToken.id)}
          type="button"
        >
          Remove Token
        </button>
      </div>
    {/if}
  </aside>
{/if}
