<script lang="ts">
  import { tick } from "svelte";
  import { base } from "$app/paths";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { guestRoster } from "$lib/stores/guest";
  import { uiStore } from "$lib/stores/ui.svelte";

  let draggedIndex = $state<number | null>(null);
  let {
    showPopoutButton = true,
    compact = false,
  }: {
    showPopoutButton?: boolean;
    compact?: boolean;
  } = $props();

  const entries = $derived(mapSession.initiativeEntries);
  const activeTokenId = $derived(mapSession.activeTokenId);
  const roster = $derived($guestRoster);
  const canManageTokens = $derived(mapStore.isGMMode && !uiStore.isGuestMode);
  const panelMaxHeight = $derived.by(() => {
    const rowHeight = compact ? 74 : 82;
    const headerHeight = compact ? 86 : 104;
    const estimated = headerHeight + entries.length * rowHeight;
    return `min(${estimated}px, 66vh)`;
  });

  function ownerName(token: (typeof mapSession.tokens)[string]) {
    if (!token) return null;
    if (token.ownerPeerId) {
      const guest = roster[token.ownerPeerId];
      return guest?.displayName ?? token.ownerGuestName ?? "Host";
    }
    return token.ownerGuestName ?? null;
  }

  function setInitiative(tokenId: string, value: number) {
    mapSession.setInitiativeValue(tokenId, value);
  }

  function selectToken(tokenId: string) {
    mapSession.setSelection(tokenId);
  }

  function handleRowContextMenu(event: MouseEvent, tokenId: string) {
    if (!canManageTokens) return;
    event.preventDefault();
    mapSession.removeToken(tokenId);
  }

  function getPanelClass() {
    return compact
      ? "flex w-full max-w-[24rem] flex-col overflow-hidden rounded-lg border border-theme-border bg-theme-surface/95 p-3 backdrop-blur shadow-xl"
      : "flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface/95 p-4 backdrop-blur shadow-xl";
  }

  function getRowClass(isActive: boolean) {
    const padding = compact ? "px-2.5 py-2" : "px-3 py-2";
    const state = isActive
      ? "border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary/30"
      : "border-theme-border bg-theme-bg/50 hover:border-theme-primary/40 hover:bg-theme-primary/5";
    return `rounded-lg border transition-colors ${padding} ${state}`;
  }

  function getInputClass() {
    return `rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-center text-sm font-semibold tabular-nums text-theme-text outline-none focus:border-theme-primary ${
      compact ? "w-12" : "w-14"
    }`;
  }

  function handleInitiativeKeydown(tokenId: string, event: KeyboardEvent) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) return;

    event.preventDefault();
    if (event.key === "ArrowUp") {
      input.stepUp();
    } else {
      input.stepDown();
    }
    setInitiative(tokenId, Number(input.value || 0));
    void tick().then(() => {
      input.focus();
    });
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    mapSession.reorderInitiative(draggedIndex, targetIndex);
    draggedIndex = null;
  }

  function popOutToWindow() {
    if (typeof window === "undefined") return;
    mapSession.refreshPopoutSnapshot();

    const url = `${base}/map/initiative`;
    window.open(
      url,
      "codex-initiative",
      "width=392,height=612,menubar=no,toolbar=no,location=no,status=no",
    );
  }
</script>

<aside
  class={getPanelClass()}
  style:max-height={panelMaxHeight}
  role="presentation"
  onmousedown={(e) => e.stopPropagation()}
>
  <div class="flex items-center justify-between gap-3">
    <div>
      <h3
        class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
      >
        Initiative
      </h3>
      <p class="text-[10px] text-theme-muted mt-1">
        Round {mapSession.round}
      </p>
    </div>

    <div class="flex items-center gap-2">
      {#if showPopoutButton}
        <button
          class="text-theme-muted hover:text-theme-text transition-colors"
          onclick={popOutToWindow}
          aria-label="Pop out initiative list"
          title="Pop out initiative list"
          type="button"
        >
          <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
          ></span>
        </button>
      {/if}

      <button
        class={`rounded-lg bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest ${
          compact ? "px-2.5 py-1.5" : "px-3 py-2"
        }`}
        onclick={() => mapSession.advanceTurn()}
        disabled={entries.length === 0}
        type="button"
      >
        Next Turn
      </button>
    </div>
  </div>

  <div
    class="mt-3 flex-1 min-h-0 space-y-2 overflow-y-auto custom-scrollbar pr-1"
    role="list"
  >
    {#each entries as entry, index (entry.tokenId)}
      {@const token = mapSession.tokens[entry.tokenId]}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        role="listitem"
        draggable="true"
        onmousedown={(e) => e.stopPropagation()}
        ondragstart={() => (draggedIndex = index)}
        ondragover={(e) => e.preventDefault()}
        ondrop={() => handleDrop(index)}
        ondblclick={() => mapSession.pingToken(entry.tokenId)}
        class={getRowClass(activeTokenId === entry.tokenId)}
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <button
                class="shrink-0 text-theme-muted hover:text-theme-primary transition-colors active:scale-90"
                onclick={(e) => {
                  e.stopPropagation();
                  mapSession.pingToken(entry.tokenId);
                }}
                onmousedown={(e) => e.stopPropagation()}
                title="Ping token on map"
                type="button"
              >
                <span class="icon-[lucide--radar] w-3.5 h-3.5"></span>
              </button>
              <button
                type="button"
                class="min-w-0 text-left cursor-pointer"
                onmousedown={(e) => e.stopPropagation()}
                onclick={(e) => {
                  e.stopPropagation();
                  selectToken(entry.tokenId);
                }}
                oncontextmenu={(event) =>
                  handleRowContextMenu(event, entry.tokenId)}
                title={canManageTokens
                  ? "Click to view token details. Right-click to delete token."
                  : "Click to view token details."}
              >
                <div class="text-sm font-bold text-theme-text truncate">
                  {token?.name}
                </div>
                {#if ownerName(token)}
                  <div
                    class="text-[9px] text-theme-muted uppercase tracking-wider truncate"
                  >
                    {ownerName(token)}
                  </div>
                {/if}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label
              class="text-[10px] uppercase tracking-widest text-theme-muted"
              for={`initiative-${entry.tokenId}`}
            >
              Init
            </label>
            <input
              id={`initiative-${entry.tokenId}`}
              type="number"
              step="1"
              min="0"
              class={getInputClass()}
              value={entry.initiativeValue}
              onmousedown={(e) => e.stopPropagation()}
              onkeydown={(event) =>
                handleInitiativeKeydown(entry.tokenId, event)}
              ondblclick={(e) => e.stopPropagation()}
              onchange={(e) =>
                setInitiative(
                  entry.tokenId,
                  Number(e.currentTarget.value || 0),
                )}
            />
          </div>
        </div>
      </div>
    {/each}

    {#if entries.length === 0}
      <div
        class="rounded-lg border border-dashed border-theme-border px-4 py-8 text-center text-xs text-theme-muted italic"
      >
        Add tokens to the initiative list to start combat.
      </div>
    {/if}
  </div>
</aside>
