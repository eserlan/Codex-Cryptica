<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { isEntityVisible, resolveStatureFromLabels } from "schema";
  import { fade } from "svelte/transition";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
  import SidepanelRevisionButton from "$lib/components/entity/SidepanelRevisionButton.svelte";
  import { shelf } from "$lib/features/shelf";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { soundBiteService } from "@codex/audio-engine";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { copyGuestEntityLink } from "$lib/services/publishing/guest-link";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import {
    dungeonDelveService,
    isDelveLocationEntity,
  } from "$lib/services/dungeon-delve-service";
  import { goto } from "$app/navigation";
  import { openCanvasFromZen } from "$lib/stores/ui/navigation";
  import StructuralSuggestionBanner from "$lib/components/guided/StructuralSuggestionBanner.svelte";
  import { getDelveCanvasLabel } from "$lib/utils/delve-terminology";

  let {
    entity,
    isEditing,
    editTitle = $bindable(),
    editAliases = $bindable([]),
    onClose,
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editTitle: string;
    editAliases: string[];
    onClose: () => void;
  }>();

  let linkCopied = $state(false);

  const handleCopyGuestLink = async () => {
    if (!guestVault.publishId) return;
    try {
      await copyGuestEntityLink(guestVault.publishId, entity.id);
      linkCopied = true;
      setTimeout(() => (linkCopied = false), 2000);
    } catch {
      notificationStore.notify("Could not copy the link.", "error");
    }
  };

  const isGraphView = $derived.by(() => {
    const path = page.url.pathname;
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return path === base || path === normalizedBase || path === "/";
  });

  let isObscured = $derived.by(() => {
    if (!entity || !vault.isGuest) return false;
    return !isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  let shelvedJustNow = $state(false);

  /**
   * Copies this entity onto the Shelf so it can be brought into another vault.
   * Read-only against this vault — nothing here is modified.
   */
  const handleSendToShelf = async () => {
    const ok = await shelf.shelve([entity.id], vault.vaultName ?? "This vault");
    if (!ok) return;
    shelvedJustNow = true;
    setTimeout(() => (shelvedJustNow = false), 2000);
  };

  const handleFindInGraph = () => {
    const nodeId = vault.selectedEntityId;
    if (!nodeId) return;

    layoutUIStore.findInGraph();

    // Trigger centering and zooming
    dispatchSearchEntityFocus(nodeId, DEFAULT_SEARCH_ENTITY_ZOOM);
  };

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");

  // Stature changes how every image of this entity is composed, so it is shown
  // wherever the thing that caused it can be edited. A label the user typed
  // wins; otherwise the stature recorded on the last image stands in, which is
  // the only place an Oracle reading is visible outside the prompt dialog.
  const statureFromLabel = $derived(resolveStatureFromLabels(entity.labels));
  const statureFromImage = $derived(
    (entity as { imageArtDirection?: { statureId?: string } }).imageArtDirection
      ?.statureId,
  );
  const stature = $derived.by(() => {
    const value = statureFromLabel || statureFromImage;
    return !value || value === "mundane" ? "" : value;
  });
  const statureLabel = $derived(
    stature ? stature.charAt(0).toUpperCase() + stature.slice(1) : "",
  );
  // An Oracle reading is recomputed on every generation. Keeping it as a label
  // makes it the user's own — stable, searchable, and editable like any other.
  const canKeepStature = $derived(
    !!stature && !statureFromLabel && !vault.isGuest,
  );
  let isKeepingStature = $state(false);

  const keepStature = async () => {
    if (!canKeepStature || isKeepingStature) return;
    isKeepingStature = true;
    try {
      await vault.addLabel(entity.id, stature);
      notificationStore.notify(`Labelled ${stature}`, "success");
    } catch {
      notificationStore.notify("Could not add the label.", "error");
    } finally {
      isKeepingStature = false;
    }
  };

  const parentEntity = $derived(
    entity?.parent ? vault.entities[entity.parent] : null,
  );

  const existingCanvas = $derived.by(() => {
    if (!entity) return undefined;
    return canvasRegistry.findCanvasForEntity(entity.id, entity.title);
  });

  const delveCanvasLabel = $derived(
    getDelveCanvasLabel(themeStore.activeTheme.id),
  );

  const handleOpenParent = () => {
    if (parentEntity) {
      vault.selectedEntityId = parentEntity.id;
    }
  };
</script>

{#if isObscured}
  <div
    class="absolute inset-0 z-[60] bg-theme-surface/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
    transition:fade
  >
    <div
      class="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse"
    >
      <span class="icon-[lucide--eye-off] w-8 h-8 text-amber-500"></span>
    </div>
    <h3
      class="text-xl font-bold text-theme-text uppercase font-header tracking-widest mb-2"
    >
      Protocol Redacted
    </h3>
    <p class="text-xs text-theme-muted leading-relaxed max-w-xs">
      This {themeStore.jargon.entity.toLowerCase()} is currently obscured by Fog of
      War. Switch to Admin Mode or remove the
      <code class="text-amber-500">hidden</code> tag to decrypt.
    </p>
    <button
      type="button"
      onclick={onClose}
      class="mt-8 px-6 py-2 border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all text-[10px] font-bold tracking-widest uppercase font-header"
    >
      Return to Overview
    </button>
  </div>
{/if}

{#snippet headerActions()}
  {#if !isEditing}
    <SidepanelRevisionButton entityId={entity.id} />
    {#if isDelveLocationEntity(entity)}
      <button
        type="button"
        onclick={async () => {
          try {
            if (existingCanvas) {
              openCanvasFromZen(existingCanvas, goto);
              return;
            }
            const canvasDoc =
              dungeonDelveService.buildDelveCanvasFromConcept(entity);
            const slug = await canvasRegistry.importCanvas(canvasDoc);
            openCanvasFromZen({ slug }, goto);
          } catch (err) {
            console.error("[DelveCanvas] Header action failed:", err);
          }
        }}
        class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
        aria-label={existingCanvas
          ? `Open ${delveCanvasLabel}`
          : `Build ${delveCanvasLabel}`}
        title={existingCanvas
          ? `Open ${delveCanvasLabel}`
          : `Build ${delveCanvasLabel}`}
        data-testid="build-delve-canvas-header-button"
      >
        <span
          aria-hidden="true"
          class="{existingCanvas
            ? 'icon-[lucide--external-link]'
            : 'icon-[lucide--map]'} w-5 h-5"
        ></span>
      </button>
    {/if}
    {#if !vault.isGuest}
      <button
        type="button"
        onclick={handleSendToShelf}
        class="transition flex items-center justify-center p-1 {shelvedJustNow
          ? 'text-theme-primary'
          : 'text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]'}"
        aria-label="Send to Shelf"
        title={shelvedJustNow
          ? "On the Shelf"
          : "Send to Shelf — to bring into another vault"}
        data-testid="send-to-shelf-button"
      >
        <span
          aria-hidden="true"
          class="{shelvedJustNow
            ? 'icon-[lucide--check]'
            : 'icon-[lucide--library]'} w-5 h-5"
        ></span>
      </button>
    {/if}
    {#if isGraphView}
      <button
        type="button"
        onclick={handleFindInGraph}
        class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
        aria-label="Find in Graph"
        title="Find in Graph"
        data-testid="find-in-graph-button"
      >
        <span aria-hidden="true" class="icon-[lucide--target] w-5 h-5"></span>
      </button>
    {/if}
    {#if vault.isGuest && guestVault.publishId}
      <button
        type="button"
        onclick={handleCopyGuestLink}
        class="transition flex items-center justify-center p-1 {linkCopied
          ? 'text-theme-primary'
          : 'text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]'}"
        aria-label="Copy link to this entity"
        title={linkCopied ? "Link copied!" : "Copy link to this entity"}
        data-testid="copy-guest-link-button"
      >
        <span
          class="{linkCopied
            ? 'icon-[lucide--check]'
            : 'icon-[lucide--link]'} w-5 h-5"
          aria-hidden="true"
        ></span>
      </button>
    {/if}
    {#if !vault.isGuest || entity.soundBite}
      <button
        type="button"
        onclick={() => {
          // Skip loadFromEntity if the modal is already showing this entity —
          // calling it again would reset result/error and interrupt active playback.
          const alreadyOpen =
            modalUIStore.soundBite?.show &&
            modalUIStore.soundBite.entityId === entity.id;
          if (!alreadyOpen) soundBiteService.loadFromEntity(entity);
          modalUIStore.openSoundBite(entity.id);
        }}
        class="transition flex items-center justify-center p-1 {entity.soundBite
          ? 'text-theme-accent hover:opacity-85'
          : 'text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]'}"
        aria-label="Sound bite"
        title={entity.soundBite ? "Play sound bite" : "Generate sound bite"}
        data-testid="sound-bite-button"
      >
        <span
          class="{entity.soundBite
            ? 'icon-[lucide--volume-2]'
            : 'icon-[lucide--mic]'} w-5 h-5"
          aria-hidden="true"
        ></span>
      </button>
    {/if}
    {#if vault.isGuest && entity.type === "character" && entity.guestChatConfig?.isEnabled && entity.guestChatConfig.extraInstructions?.trim()}
      <button
        type="button"
        onclick={() => guestChatStore.openChat(entity.id, entity.title)}
        class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
        aria-label="Chat with character"
        title="Chat with character"
        data-testid="guest-chat-button"
      >
        <span aria-hidden="true" class="icon-[lucide--messages-square] w-5 h-5"
        ></span>
      </button>
    {/if}
    <button
      type="button"
      onclick={() => modalUIStore.openZenMode(entity.id)}
      class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
      aria-label="Enter Zen Mode"
      title="Zen Mode (Full Screen)"
      data-testid="enter-zen-mode-button"
    >
      <span aria-hidden="true" class="icon-[lucide--maximize-2] w-5 h-5"></span>
    </button>
  {/if}
{/snippet}

<div
  class="p-4 md:p-6 border-b border-theme-border bg-theme-surface"
  style:background-color="var(--theme-panel-fill)"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Mobile-only top bar -->
  <div class="flex md:hidden justify-between items-center mb-4">
    <button
      type="button"
      onclick={onClose}
      class="text-theme-muted hover:text-theme-primary transition p-1 -ml-2 rounded-full shrink-0"
      aria-label="Back"
    >
      <span aria-hidden="true" class="icon-[lucide--chevron-left] w-7 h-7"
      ></span>
    </button>
    <div class="flex items-center gap-1.5">
      {@render headerActions()}
    </div>
  </div>

  <div
    class="mb-2 min-w-0 md:flex md:flex-wrap md:items-center md:justify-between"
  >
    <div
      class="flex w-full min-w-0 items-start gap-3 md:flex-[1_1_14rem] md:items-center md:gap-4"
    >
      {#if isEditing}
        <div class="flex flex-col gap-2 w-full mr-4">
          <input
            type="text"
            bind:value={editTitle}
            class="bg-theme-bg border border-theme-primary text-theme-text px-2 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-xl w-full placeholder-theme-muted"
            placeholder="Entity Title"
          />
          <AliasInput bind:aliases={editAliases} placeholder="Add alias..." />
        </div>
      {:else}
        <div class="flex flex-col gap-0.5 min-w-0 w-full">
          <h2
            class="{isFantasyTheme
              ? 'text-xl md:text-3xl font-header tracking-wider'
              : 'text-xl md:text-3xl font-body tracking-wide'} w-full break-words whitespace-normal font-bold"
            style:color={isFantasyTheme ? "var(--theme-title-ink)" : undefined}
          >
            {entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                aria-hidden="true">*</sup
              ><span class="sr-only"> (past)</span>{/if}
          </h2>
          {#if entity.aliases && entity.aliases.length > 0}
            <div class="flex flex-wrap gap-1 md:gap-1.5 mt-0.5">
              <span
                class="text-[8px] md:text-[9px] font-bold text-theme-muted uppercase tracking-widest self-center mr-0.5 md:mr-1"
                >aka:</span
              >
              {#each entity.aliases as alias}
                <div
                  class="px-1.5 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[8px] md:text-[9px] font-bold text-theme-secondary uppercase tracking-wider"
                >
                  {alias}
                </div>
              {/each}
            </div>
          {/if}
          {#if parentEntity}
            <div
              class="flex items-center gap-1.5 text-xs text-theme-muted mt-1.5"
              data-testid="sidebar-parent-indicator"
            >
              <span
                class="icon-[lucide--folder-up] h-3.5 w-3.5 text-theme-muted"
              ></span>
              <span>Parent:</span>
              <button
                type="button"
                onclick={handleOpenParent}
                class="text-theme-primary hover:text-theme-primary/80 hover:underline font-semibold focus:outline-none transition-all"
              >
                {parentEntity.title}{#if parentEntity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                    aria-hidden="true">*</sup
                  ><span class="sr-only"> (past)</span>{/if}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div
      class="ml-2 hidden shrink-0 items-center gap-1.5 md:ml-auto md:flex md:gap-2"
    >
      {@render headerActions()}

      <!-- Desktop-only close button -->
      <button
        type="button"
        onclick={onClose}
        class="flex transition items-center justify-center p-1 text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-icon-active)]"
        aria-label="Close panel"
        title="Close"
      >
        <span aria-hidden="true" class="icon-[heroicons--x-mark] w-6 h-6"
        ></span>
      </button>
    </div>
  </div>

  <!-- Labels Section -->
  <div class="mt-4 mb-2 space-y-2">
    <div class="flex flex-wrap gap-1.5 min-h-[24px]">
      {#each entity.labels || [] as label}
        <LabelBadge
          {label}
          removable={!vault.isGuest}
          onRemove={async () => await vault.removeLabel(entity.id, label)}
        />
      {/each}
      {#if statureLabel}
        <span
          class="px-1.5 py-0.5 rounded bg-theme-primary/10 border border-theme-primary/20 text-[8px] md:text-[9px] font-bold text-theme-secondary uppercase tracking-wider self-center"
          title={statureFromLabel
            ? `Images of this entity are drawn at ${statureLabel} stature, from its labels.`
            : `The Oracle read this as ${statureLabel} in your lore, and images are drawn that way.`}
          data-testid="entity-stature-badge"
        >
          Drawn as {statureLabel}
        </span>
        {#if canKeepStature}
          <button
            type="button"
            onclick={keepStature}
            disabled={isKeepingStature}
            title="Add {stature} as a label so it stops being re-read, and stays the same across pictures."
            data-testid="entity-stature-keep"
            class="px-1.5 py-0.5 rounded border border-dashed border-theme-primary/30 text-[8px] md:text-[9px] font-bold text-theme-primary uppercase tracking-wider self-center transition hover:bg-theme-primary/10 disabled:opacity-50"
          >
            Keep
          </button>
        {/if}
      {/if}
      {#if !entity.labels?.length && vault.isGuest}
        <span
          class="text-[9px] text-theme-muted italic uppercase tracking-tighter"
        >
          No labels
        </span>
      {/if}
    </div>

    {#if !vault.isGuest}
      <LabelInput entityId={entity.id} />
    {/if}
  </div>

  {#if !vault.isGuest}
    <StructuralSuggestionBanner entityId={entity.id} />
  {/if}
</div>
