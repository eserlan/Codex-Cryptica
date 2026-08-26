<script lang="ts">
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { mapSession } from "../../stores/map-session.svelte";
  import { TOKEN_STATUS_EFFECTS } from "../../../types/vtt";
  import { isNoteCollapsed } from "map-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { vault } from "../../stores/vault.svelte";
  import SpatialImageControls from "$lib/components/spatial/SpatialImageControls.svelte";
  import ImageFocusMenu from "$lib/components/ui/ImageFocusMenu.svelte";
  import LayerMenu from "$lib/components/ui/LayerMenu.svelte";

  let {
    x,
    y,
    imgX,
    imgY,
    tokenId,
    onClose,
  }: {
    x: number;
    y: number;
    imgX: number;
    imgY: number;
    tokenId?: string;
    onClose: () => void;
  } = $props();

  let showResizeSubmenu = $state(false);
  let showStatusSubmenu = $state(false);
  let showAppearanceSubmenu = $state(false);
  let showLayerSubmenu = $state(false);
</script>

<div
  class="fixed z-[1000] bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[140px]"
  style="left: {x}px; top: {y}px;"
  transition:fade={{ duration: 100 }}
  role="menu"
  tabindex="-1"
  aria-label="Map context menu"
  onmousedown={(e) => e.stopPropagation()}
>
  {#if tokenId}
    <button
      class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
      role="menuitem"
      onclick={() => {
        mapSession.pingToken(tokenId);
        onClose();
      }}
    >
      <span
        class="icon-[lucide--radar] w-3.5 h-3.5 text-theme-primary"
        aria-hidden="true"
      ></span>
      <span>Ping Token</span>
    </button>

    <!-- View Entity (host always; guest only if token is not gm-only) -->
    {@const _ctxToken = mapSession.tokens[tokenId]}
    {@const _ctxTokenHasImage = Boolean(
      _ctxToken?.imageUrl ||
      (_ctxToken?.entityId && vault.entities[_ctxToken.entityId]?.image),
    )}
    {#if _ctxToken?.kind === "note" && mapStore.isGMMode && !sessionModeStore.isGuestMode}
      {@const _ctxNoteCollapsed = isNoteCollapsed(_ctxToken)}
      <div class="h-px bg-theme-border my-1 mx-2"></div>
      <button
        class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
        role="menuitem"
        onclick={() => {
          mapSession.toggleNoteCollapsed(tokenId);
          onClose();
        }}
      >
        <span
          class={`${_ctxNoteCollapsed ? "icon-[lucide--maximize-2]" : "icon-[lucide--minimize-2]"} w-3.5 h-3.5 text-theme-muted`}
          aria-hidden="true"
        ></span>
        <span>{_ctxNoteCollapsed ? "Expand note" : "Collapse to a marker"}</span
        >
      </button>
    {/if}

    {#if _ctxToken?.kind === "tile" && mapStore.isGMMode && !sessionModeStore.isGuestMode}
      <div class="h-px bg-theme-border my-1 mx-2"></div>
      <SpatialImageControls
        locked={_ctxToken.locked === true}
        onToggleLock={() => {
          mapSession.toggleTokenLock(tokenId);
          onClose();
        }}
        onBringToFront={() => {
          mapSession.bringTokenToFront(tokenId);
          onClose();
        }}
        onSendToBack={() => {
          mapSession.sendTokenToBack(tokenId);
          onClose();
        }}
        onDuplicate={() => {
          mapSession.cloneToken(tokenId);
          onClose();
        }}
        onDelete={() => {
          mapSession.removeToken(tokenId);
          onClose();
        }}
      />
    {/if}

    {#if mapStore.isGMMode && !sessionModeStore.isGuestMode}
      <!-- Move to Layer (Host only) — works for both tiles and tokens, so it
           lives outside the kind-gated blocks above/below. -->
      <div
        class="relative group"
        role="presentation"
        onmouseenter={() => {
          showLayerSubmenu = true;
        }}
        onmouseleave={() => {
          showLayerSubmenu = false;
        }}
      >
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={showLayerSubmenu}
          onclick={(e) => {
            e.stopPropagation();
            showLayerSubmenu = !showLayerSubmenu;
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              showLayerSubmenu = !showLayerSubmenu;
            }
          }}
        >
          <div class="flex items-center gap-2">
            <span class="icon-[lucide--layers] w-3.5 h-3.5" aria-hidden="true"
            ></span>
            <span>Move to Layer</span>
          </div>
          <span
            class="icon-[lucide--chevron-right] w-3 h-3 opacity-50"
            aria-hidden="true"
          ></span>
        </button>

        {#if showLayerSubmenu}
          <div
            class="absolute left-full top-0 ml-px bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[150px]"
            role="menu"
            aria-label="Move token to layer"
          >
            <LayerMenu
              value={_ctxToken?.layer}
              onSelect={(layer) => {
                mapSession.updateToken(tokenId, { layer });
                // Land on top of wherever it just moved, not stacked
                // underneath whatever was already on that layer.
                mapSession.bringTokenToFront(tokenId);
                onClose();
              }}
            />
          </div>
        {/if}
      </div>
    {/if}

    {#if _ctxToken?.entityId && mapSession.canViewToken(tokenId, mapSession.myPeerId, mapStore.isGMMode)}
      <div class="h-px bg-theme-border my-1 mx-2"></div>
      <button
        class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
        role="menuitem"
        onclick={() => {
          if (_ctxToken?.entityId) {
            modalUIStore.openZenMode(_ctxToken.entityId);
            onClose();
          }
        }}
      >
        <span
          class="icon-[lucide--book-open] w-3.5 h-3.5 text-theme-primary"
          aria-hidden="true"
        ></span>
        <span>Look at {_ctxToken.name}</span>
      </button>
    {/if}

    <!-- Multi-select actions (GM only) -->
    {#if mapStore.isGMMode && !sessionModeStore.isGuestMode && _ctxToken?.kind !== "tile"}
      {#if mapSession.selectedTokens.size > 1 && mapSession.selectedTokens.has(tokenId)}
        <div class="h-px bg-theme-border my-1 mx-2"></div>
        <div
          class="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-theme-muted"
        >
          {mapSession.selectedTokens.size} tokens selected
        </div>
        <!-- Hide Selected -->
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
          role="menuitem"
          onclick={() => {
            for (const id of mapSession.selectedTokens) {
              mapSession.toggleTokenVisibility(id);
            }
            onClose();
          }}
        >
          <span
            class="icon-[lucide--eye-off] w-3.5 h-3.5 text-theme-muted"
            aria-hidden="true"
          ></span>
          <span>Hide Selected</span>
        </button>
        <!-- Remove Selected -->
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-red-400"
          role="menuitem"
          onclick={() => {
            for (const id of mapSession.selectedTokens) {
              mapSession.removeToken(id);
            }
            onClose();
          }}
        >
          <span class="icon-[lucide--trash-2] w-3.5 h-3.5" aria-hidden="true"
          ></span>
          <span>Remove Selected</span>
        </button>
      {:else}
        <!-- Select All Visible -->
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
          role="menuitem"
          onclick={() => {
            const allIds = Object.keys(mapSession.tokens);
            mapSession.setMultiSelection(allIds);
            onClose();
          }}
        >
          <span
            class="icon-[lucide--square-mouse-pointer] w-3.5 h-3.5 text-theme-muted"
          ></span>
          <span>Select All</span>
        </button>
      {/if}
    {/if}

    <div class="h-px bg-theme-border my-1 mx-2"></div>

    <!-- Removal -->
    {#if mapStore.isGMMode && !sessionModeStore.isGuestMode && _ctxToken?.kind !== "tile"}
      <button
        class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
        role="menuitem"
        onclick={() => {
          mapSession.cloneToken(tokenId);
          onClose();
        }}
      >
        <span class="icon-[lucide--copy-plus] w-3.5 h-3.5" aria-hidden="true"
        ></span>
        <span>Clone Token</span>
      </button>

      <!-- Show/Hide Token -->
      <button
        class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
        role="menuitem"
        onclick={() => {
          mapSession.toggleTokenVisibility(tokenId);
          onClose();
        }}
      >
        {#if _ctxToken?.visibleTo === "all"}
          <span
            class="icon-[lucide--eye-off] w-3.5 h-3.5 text-theme-muted"
            aria-hidden="true"
          ></span>
          <span>Hide from Guests</span>
        {:else}
          <span
            class="icon-[lucide--eye] w-3.5 h-3.5 text-theme-primary"
            aria-hidden="true"
          ></span>
          <span>Show to All</span>
        {/if}
      </button>

      <button
        class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-red-400"
        role="menuitem"
        onclick={() => {
          mapSession.removeToken(tokenId);
          onClose();
        }}
      >
        <span class="icon-[lucide--trash-2] w-3.5 h-3.5" aria-hidden="true"
        ></span>
        <span>Remove Token</span>
      </button>

      <!-- Appearance Submenu (Host only) -->
      <div
        class="relative group"
        role="presentation"
        onmouseenter={() => {
          showAppearanceSubmenu = true;
          showResizeSubmenu = false;
          showStatusSubmenu = false;
        }}
        onmouseleave={() => {
          showAppearanceSubmenu = false;
        }}
      >
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={showAppearanceSubmenu}
          onclick={(e) => {
            e.stopPropagation();
            showAppearanceSubmenu = !showAppearanceSubmenu;
            if (showAppearanceSubmenu) {
              showResizeSubmenu = false;
              showStatusSubmenu = false;
            }
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              showAppearanceSubmenu = !showAppearanceSubmenu;
            }
          }}
        >
          <div class="flex items-center gap-2">
            <span
              class="icon-[lucide--circle-dashed] w-3.5 h-3.5"
              aria-hidden="true"
            ></span>
            <span>Appearance</span>
          </div>
          <span
            class="icon-[lucide--chevron-right] w-3 h-3 opacity-50"
            aria-hidden="true"
          ></span>
        </button>

        {#if showAppearanceSubmenu}
          <div
            class="absolute left-full top-0 ml-px bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[150px]"
            role="menu"
            aria-label="Token appearance options"
          >
            <button
              class="w-full text-left px-4 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
              role="menuitemcheckbox"
              aria-checked={_ctxToken?.facingIndicator === true}
              onclick={() => {
                if (_ctxToken) {
                  mapSession.updateToken(tokenId, {
                    facingIndicator: !_ctxToken.facingIndicator,
                  });
                }
                onClose();
              }}
            >
              <span>Facing indicator</span>
              <span class="text-[10px] text-theme-muted"
                >{_ctxToken?.facingIndicator ? "ON" : "OFF"}</span
              >
            </button>
            {#each ["circle", "square"] as shape (shape)}
              <button
                class="w-full text-left px-4 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
                role="menuitemradio"
                aria-checked={(_ctxToken?.baseShape ?? "circle") === shape}
                onclick={() => {
                  mapSession.updateToken(tokenId, {
                    baseShape: shape as "circle" | "square",
                  });
                  onClose();
                }}
              >
                <span class="capitalize">{shape} base</span>
                {#if (_ctxToken?.baseShape ?? "circle") === shape}
                  <span aria-hidden="true">✓</span>
                {/if}
              </button>
            {/each}

            {#if _ctxTokenHasImage}
              <div class="h-px bg-theme-border my-1 mx-2"></div>
              <div
                class="px-4 py-1 text-[9px] font-bold uppercase tracking-widest text-theme-muted"
              >
                Image focus
              </div>
              <ImageFocusMenu
                value={_ctxToken?.imageFocus}
                onSelect={(focus) => {
                  mapSession.updateToken(tokenId, { imageFocus: focus });
                  onClose();
                }}
              />
            {/if}
          </div>
        {/if}
      </div>

      <!-- Resize Submenu (Host only) -->
      <div
        class="relative group"
        role="presentation"
        onmouseenter={() => {
          showResizeSubmenu = true;
          showStatusSubmenu = false;
        }}
        onmouseleave={() => {
          showResizeSubmenu = false;
          showStatusSubmenu = false;
        }}
      >
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={showResizeSubmenu}
          onclick={(e) => {
            e.stopPropagation();
            showResizeSubmenu = !showResizeSubmenu;
            if (showResizeSubmenu) showStatusSubmenu = false;
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              showResizeSubmenu = !showResizeSubmenu;
              if (showResizeSubmenu) showStatusSubmenu = false;
            }
          }}
        >
          <div class="flex items-center gap-2">
            <span class="icon-[lucide--maximize] w-3.5 h-3.5" aria-hidden="true"
            ></span>
            <span>Resize</span>
          </div>
          <span
            class="icon-[lucide--chevron-right] w-3 h-3 opacity-50"
            aria-hidden="true"
          ></span>
        </button>

        {#if showResizeSubmenu}
          <div
            class="absolute left-full top-0 ml-px bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[100px]"
            role="menu"
            aria-label="Resize options"
          >
            {#each [1, 2, 3, 4] as scale (scale)}
              <button
                class="w-full text-left px-4 py-2 text-xs hover:bg-theme-primary/20 hover:text-theme-primary transition-colors font-mono"
                role="menuitem"
                onclick={() => {
                  const gridSize = mapStore.gridSize || 50;
                  const token = mapSession.tokens[tokenId];
                  if (token) {
                    const snappedX =
                      Math.round((token.x - mapStore.gridOffsetX) / gridSize) *
                        gridSize +
                      mapStore.gridOffsetX;
                    const snappedY =
                      Math.round((token.y - mapStore.gridOffsetY) / gridSize) *
                        gridSize +
                      mapStore.gridOffsetY;

                    mapSession.updateToken(tokenId, {
                      x: snappedX,
                      y: snappedY,
                      width: scale * gridSize,
                      height: scale * gridSize,
                    });
                  }
                  onClose();
                  showResizeSubmenu = false;
                }}
              >
                {scale}x{scale}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Status Submenu (Host only) -->
      {@const activeEffects = _ctxToken?.statusEffects ?? []}
      <div
        class="relative group"
        role="presentation"
        onmouseenter={() => {
          showStatusSubmenu = true;
          showResizeSubmenu = false;
        }}
        onmouseleave={() => {
          showStatusSubmenu = false;
          showResizeSubmenu = false;
        }}
      >
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={showStatusSubmenu}
          onclick={(e) => {
            e.stopPropagation();
            showStatusSubmenu = !showStatusSubmenu;
            if (showStatusSubmenu) showResizeSubmenu = false;
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              showStatusSubmenu = !showStatusSubmenu;
              if (showStatusSubmenu) showResizeSubmenu = false;
            }
          }}
        >
          <div class="flex items-center gap-2">
            <span class="icon-[lucide--badge] w-3.5 h-3.5" aria-hidden="true"
            ></span>
            <span>Status</span>
          </div>
          <span
            class="icon-[lucide--chevron-right] w-3 h-3 opacity-50"
            aria-hidden="true"
          ></span>
        </button>

        {#if showStatusSubmenu}
          <div
            class="absolute left-full top-0 ml-px bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[160px]"
            role="menu"
            aria-label="Status options"
          >
            {#each TOKEN_STATUS_EFFECTS as effect (effect.id)}
              {@const isActive = activeEffects.includes(effect.id)}
              <button
                class="w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2 {isActive
                  ? 'text-theme-primary hover:bg-theme-primary/20'
                  : 'text-theme-text hover:bg-theme-bg/50'}"
                role="menuitemcheckbox"
                aria-checked={isActive}
                onclick={() => {
                  const token = mapSession.tokens[tokenId];
                  if (token) {
                    const current = token.statusEffects ?? [];
                    const updated = isActive
                      ? current.filter((e: string) => e !== effect.id)
                      : [...current, effect.id];
                    mapSession.updateToken(tokenId, {
                      statusEffects: updated,
                    });
                  }
                  onClose();
                  showStatusSubmenu = false;
                  showResizeSubmenu = false;
                }}
              >
                <span
                  class="{effect.icon} w-3.5 h-3.5 flex-shrink-0"
                  style:color={effect.color}
                ></span>
                <span class="flex-1">{effect.label}</span>
                {#if isActive}
                  <span
                    class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-900/10 text-[11px] font-black leading-none text-amber-950 shadow-[0_0_0_1px_rgba(120,53,15,0.25)]"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <button
      class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
      role="menuitem"
      onclick={() => {
        mapSession.ping(imgX, imgY);
        onClose();
      }}
    >
      <span
        class="icon-[lucide--map-pin] w-3.5 h-3.5 text-theme-primary"
        aria-hidden="true"
      ></span>
      <span>Ping Here</span>
    </button>
  {/if}
</div>
