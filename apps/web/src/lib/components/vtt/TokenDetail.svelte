<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { guestStore } from "$lib/stores/guest.svelte";
  import { mapStore } from "$lib/stores/map.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import TokenQuickStats from "./TokenQuickStats.svelte";
  import SpatialImageDetails from "$lib/components/spatial/SpatialImageDetails.svelte";
  import TokenNoteEditor from "./TokenNoteEditor.svelte";
  import { isNoteCollapsed } from "map-engine";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  const selectedToken = $derived(mapSession.selectedToken);
  const linkedEntity = $derived.by(() => {
    if (!selectedToken?.entityId) return null;
    return vault.entities[selectedToken.entityId] || null;
  });
  const canManageToken = $derived(
    mapStore.isGMMode && !sessionModeStore.isGuestMode,
  );
  const guests = $derived.by(() =>
    guestStore.allGuests.toSorted((a, b) =>
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
  /**
   * AI generation is offered on a note only when there is an AI to reach:
   * enabled in settings, and not a guest, who has no key of their own.
   */
  const canGenerateEncounter = $derived(oracle.isEnabled && !vault.isGuest);
  let generatingEncounterFor = $state<string | null>(null);
  /**
   * A guest has no vault to keep anything in, and a note already linked to an
   * entity is kept — the panel shows that link above instead.
   */
  const canSaveNoteToVault = $derived(
    canManageToken && !vault.isGuest && !selectedToken?.entityId,
  );
  let savingNoteToVaultFor = $state<string | null>(null);

  const availableTiles = $derived(
    Object.values(mapSession.tokens).filter((t) => t.kind === "tile"),
  );
  const parentTile = $derived(
    selectedToken?.parentTokenId
      ? (mapSession.tokens[selectedToken.parentTokenId] ?? null)
      : null,
  );
  const attachedNotes = $derived(
    selectedToken?.id ? mapSession.getChildNotes(selectedToken.id) : [],
  );

  let pendingVaultSyncTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingVaultEntityId: string | null = null;
  let pendingVaultContent: string | null = null;

  function flushPendingVaultSync() {
    if (pendingVaultSyncTimeout) {
      clearTimeout(pendingVaultSyncTimeout);
      pendingVaultSyncTimeout = null;
    }
    if (pendingVaultEntityId && pendingVaultContent !== null) {
      const entityId = pendingVaultEntityId;
      const content = pendingVaultContent;
      pendingVaultEntityId = null;
      pendingVaultContent = null;
      void vault.updateEntity(entityId, { content });
    }
  }

  function handleNoteBodyChange(tokenId: string, nextBody: string) {
    mapSession.updateToken(tokenId, { noteBody: nextBody });
    const token = mapSession.tokens[tokenId];
    if (token?.entityId && canManageToken && !vault.isGuest) {
      pendingVaultEntityId = token.entityId;
      pendingVaultContent = nextBody;
      if (pendingVaultSyncTimeout) clearTimeout(pendingVaultSyncTimeout);
      pendingVaultSyncTimeout = setTimeout(() => {
        flushPendingVaultSync();
      }, 300);
    }
  }

  function handleNoteTitleChange(tokenId: string, nextTitle: string) {
    mapSession.updateToken(tokenId, { name: nextTitle });
    const token = mapSession.tokens[tokenId];
    if (token?.entityId && canManageToken && !vault.isGuest) {
      void vault.updateEntity(token.entityId, { title: nextTitle });
    }
  }

  $effect(() => {
    return () => {
      flushPendingVaultSync();
    };
  });

  /**
   * Writes a map note into the vault as a Note entity and links the marker to
   * it. A note is session furniture that goes away when the session does;
   * this is how the GM keeps the one that turned out to matter, without
   * every rolled room note becoming vault clutter by default.
   */
  async function saveNoteToVault(tokenId: string) {
    if (savingNoteToVaultFor) return;
    const note = mapSession.tokens[tokenId];
    if (!note || note.kind !== "note") return;

    savingNoteToVaultFor = tokenId;
    try {
      const title = note.name.trim() || "Note";
      const entityId = await vault.createEntity("note", title, {
        content: note.noteBody ?? "",
      });
      // The GM may have deleted the note while the write was in flight, in
      // which case the entity stands on its own and there is nothing to link.
      if (mapSession.tokens[tokenId]) {
        mapSession.updateToken(tokenId, { entityId });
      }
      notificationStore.notify(`"${title}" kept in the vault.`, "success");
    } catch (error) {
      console.error("[VTT] Keeping a note in the vault failed", error);
      notificationStore.notify(
        "That note could not be kept in the vault.",
        "error",
      );
    } finally {
      savingNoteToVaultFor = null;
    }
  }

  async function generateEncounterInto(tokenId: string) {
    if (generatingEncounterFor) return;
    generatingEncounterFor = tokenId;
    try {
      // Imported on demand: the generator pulls in the whole prompt/table
      // stack, which no VTT session should pay for until a GM asks for it.
      const { generateNoteEncounter } =
        await import("$lib/services/vtt/note-encounter");
      const { body, aiFallback } = await generateNoteEncounter({
        themeId: themeStore.worldThemeId,
        context: mapStore.activeMap?.name,
      });
      // The GM may have selected another token, or started typing into this
      // one, while the model was working — either way the result is no longer
      // wanted where it was asked for.
      const note = mapSession.tokens[tokenId];
      if (!note || note.kind !== "note" || (note.noteBody ?? "").trim()) return;
      handleNoteBodyChange(tokenId, body);
      if (aiFallback) {
        notificationStore.notify(
          "AI was unavailable, so this encounter came from the local tables.",
          "info",
        );
      }
    } catch (error) {
      console.error("[VTT] Encounter generation failed", error);
      notificationStore.notify(
        "That encounter could not be generated.",
        "error",
      );
    } finally {
      generatingEncounterFor = null;
    }
  }

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
    ondblclick={(e) => e.stopPropagation()}
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        {#if selectedToken.kind === "note" && canManageToken}
          <input
            type="text"
            value={selectedToken.name}
            oninput={(e) =>
              handleNoteTitleChange(selectedToken.id, e.currentTarget.value)}
            placeholder="Note title…"
            aria-label="Note title"
            data-testid="token-note-title-input"
            class="w-full font-bold uppercase tracking-widest text-theme-text font-header text-sm bg-transparent border-b border-theme-border/50 focus:border-theme-primary outline-none py-0.5"
          />
        {:else}
          <h3
            class="text-sm font-bold uppercase tracking-widest text-theme-text font-header truncate"
          >
            {selectedToken.name}
          </h3>
        {/if}
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
        <span aria-hidden="true" class="icon-[lucide--x] w-4 h-4"></span>
      </button>
    </div>

    {#if linkedEntity}
      <div
        class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 flex items-center justify-between gap-2"
        data-testid="token-linked-entity-card"
      >
        <div class="min-w-0 flex-1">
          <div class="text-[10px] uppercase tracking-widest text-theme-muted">
            Linked Entity
          </div>
          <div class="text-sm font-bold text-theme-text truncate">
            {linkedEntity.title}
          </div>
          <div class="text-[10px] uppercase tracking-widest text-theme-muted">
            {linkedEntity.type}
          </div>
        </div>
        <button
          type="button"
          onclick={() => modalUIStore.openZenMode(linkedEntity.id)}
          class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 text-[10px] font-medium text-theme-muted hover:border-theme-primary hover:text-theme-primary transition-colors shrink-0"
          title="Open in Zen Mode"
          aria-label="Open entity in Zen Mode"
        >
          <span class="icon-[lucide--maximize-2] h-3 w-3" aria-hidden="true"
          ></span>
          <span>Open</span>
        </button>
      </div>
      {#if linkedEntity.statSheet?.fields?.length}
        <TokenQuickStats entity={linkedEntity} />
      {/if}
    {:else if selectedToken.kind !== "note"}
      <div
        class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 text-sm text-theme-muted"
      >
        Freeform marker
      </div>
    {/if}

    {#if selectedToken.kind === "note"}
      {#if parentTile}
        <div
          class="flex items-center justify-between rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 text-xs text-theme-primary"
          data-testid="token-note-parent-badge"
        >
          <button
            type="button"
            onclick={() =>
              mapSession.setSelection(selectedToken.parentTokenId!)}
            class="flex items-center gap-1.5 font-medium hover:underline text-left truncate"
            title="Select parent tile {parentTile.name}"
          >
            <span
              class="icon-[lucide--layers] h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            ></span>
            <span class="truncate"
              >Attached to <strong>{parentTile.name || "Tile"}</strong></span
            >
          </button>
          {#if canManageToken}
            <button
              type="button"
              onclick={() => mapSession.unlinkToken(selectedToken.id)}
              class="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-theme-primary hover:bg-theme-primary/20"
              title="Unlink note from this tile"
              data-testid="token-note-unlink-btn"
            >
              Unlink
            </button>
          {/if}
        </div>
      {:else if canManageToken && availableTiles.length > 0}
        <div class="space-y-1" data-testid="token-note-link-section">
          <label
            class="block text-[10px] font-bold uppercase tracking-widest text-theme-muted"
            for="link-parent-tile"
          >
            Link to Tile
          </label>
          <select
            id="link-parent-tile"
            class="w-full rounded-md border border-theme-border bg-theme-bg px-2.5 py-1 text-xs text-theme-text focus:border-theme-primary outline-none"
            value=""
            onchange={(e) => {
              if (e.currentTarget.value) {
                mapSession.linkTokens(selectedToken.id, e.currentTarget.value);
              }
            }}
          >
            <option value="" disabled>Link to a tile on the map…</option>
            {#each availableTiles as tile (tile.id)}
              <option value={tile.id}>{tile.name}</option>
            {/each}
          </select>
        </div>
      {/if}

      <TokenNoteEditor
        body={selectedToken.noteBody ?? ""}
        collapsed={isNoteCollapsed(selectedToken)}
        disabled={!canManageToken}
        generating={generatingEncounterFor === selectedToken.id}
        onChange={(body) => handleNoteBodyChange(selectedToken.id, body)}
        onBlur={flushPendingVaultSync}
        onToggleCollapsed={() =>
          mapSession.toggleNoteCollapsed(selectedToken.id)}
        onGenerateEncounter={canGenerateEncounter
          ? () => void generateEncounterInto(selectedToken.id)
          : undefined}
        savingToVault={savingNoteToVaultFor === selectedToken.id}
        onSaveToVault={canSaveNoteToVault
          ? () => void saveNoteToVault(selectedToken.id)
          : undefined}
      />
    {/if}

    {#if selectedToken.kind === "tile"}
      {#if attachedNotes.length > 0}
        <div
          class="rounded-lg border border-theme-border bg-theme-bg/50 p-3 space-y-2"
          data-testid="tile-attached-notes"
        >
          <div
            class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
          >
            Stocked Notes ({attachedNotes.length})
          </div>
          <div class="space-y-1">
            {#each attachedNotes as note (note.id)}
              <button
                type="button"
                onclick={() => mapSession.setSelection(note.id)}
                class="flex w-full items-center justify-between rounded-md border border-theme-border bg-theme-surface px-2.5 py-1.5 text-xs text-theme-text hover:border-theme-primary hover:text-theme-primary transition-colors text-left"
              >
                <span class="truncate font-medium"
                  >{note.name || "Untitled Note"}</span
                >
                <span
                  class="icon-[lucide--chevron-right] h-3.5 w-3.5 shrink-0 text-theme-muted"
                  aria-hidden="true"
                ></span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if selectedToken.tileDetails}
        <SpatialImageDetails
          details={selectedToken.tileDetails}
          disabled={!canManageToken}
          onChange={(updates) =>
            mapSession.updateToken(selectedToken.id, {
              tileDetails: { ...selectedToken.tileDetails!, ...updates },
            })}
        />
      {/if}
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

      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-theme-border accent-theme-primary"
          checked={selectedToken.isVisionSource === true}
          onchange={(e) =>
            mapSession.setVisionSource(
              selectedToken.id,
              e.currentTarget.checked,
            )}
        />
        <span
          class="text-[10px] uppercase tracking-widest font-bold text-theme-muted"
        >
          Vision Source (PC)
        </span>
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
            <span aria-hidden="true" class="icon-[lucide--image-up] h-4 w-4"
            ></span>
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
