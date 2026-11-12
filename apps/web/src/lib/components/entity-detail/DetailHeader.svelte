<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { isEntityVisible, resolveStatureFromLabels } from "schema";
  import { fade } from "svelte/transition";
  import LabelBadge from "#lib/components/labels/LabelBadge.svelte";
  import LabelInput from "#lib/components/labels/LabelInput.svelte";
  import AliasInput from "#lib/components/labels/AliasInput.svelte";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { page } from "$app/state";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { guestVault } from "#lib/stores/guest-vault.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
  import StructuralSuggestionBanner from "#lib/components/guided/StructuralSuggestionBanner.svelte";
  import SaveStatusIndicator from "#lib/components/ui/SaveStatusIndicator.svelte";
  import { createMonsterLabsHandoffFlow } from "#lib/services/seo/monsterlabs-handoff-flow.svelte.js";
  import { entityToHandoffSource } from "#lib/services/seo/monsterlabs-handoff.js";
  import EntityActionBar from "./EntityActionBar.svelte";
  import { createEntityActions } from "./entity-actions.svelte.js";
  import MonsterLabsSendingModal from "#lib/components/modals/MonsterLabsSendingModal.svelte";
  import DetailThumbnail from "./DetailThumbnail.svelte";
  import DetailGenerateArt from "./DetailGenerateArt.svelte";
  import {
    pickEntityImage,
    showEntityImageToGuests,
  } from "./entity-image-file.js";
  import { p2pHost } from "#lib/cloud-bridge/p2p/host-service.svelte.js";

  let {
    entity,
    isEditing,
    editTitle = $bindable(),
    editAliases = $bindable([]),
    onClose,
    onStartEdit,
    onDelete,
    canGuestEdit = false,
  }: {
    entity: Entity;
    isEditing: boolean;
    editTitle: string;
    editAliases: string[];
    onClose: () => void;
    onStartEdit?: () => void;
    onDelete?: () => void | Promise<void>;
    canGuestEdit?: boolean;
  } = $props();

  const isGraphView = $derived(
    page.url.pathname === "/" || page.url.pathname === "",
  );

  let isObscured = $derived.by(() => {
    if (!entity || !vault.isGuest) return false;
    return !isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const monsterLabsFlow = createMonsterLabsHandoffFlow();
  const handleSendToMonsterLabs = () =>
    monsterLabsFlow.start(entityToHandoffSource(entity));

  const entityActions = createEntityActions(() => ({
    entity,
    isGuest: vault.isGuest,
    isGraphView,
    canGuestEdit,
    publishId: guestVault.publishId,
    existingCanvas,
    onStartEdit,
    onDelete,
    onChangeImage: () => pickEntityImage(entity.id),
    onChooseSilhouette: () => modalUIStore.openSilhouettePicker(entity),
    onShowToGuests:
      p2pHost.isHosting && entity.image
        ? () => showEntityImageToGuests(entity)
        : undefined,
    onMonsterLabs: handleSendToMonsterLabs,
    monsterLabsOpen: monsterLabsFlow.open,
    monsterLabsLoading: monsterLabsFlow.state === "loading",
  }));

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

  const handleOpenParent = () => {
    if (parentEntity) {
      vault.selectedEntityId = parentEntity.id;
    }
  };

  // Guests read the hierarchy but never rearrange it.
  const canEditParent = $derived(!vault.isGuest);
</script>

{#if isObscured}
  <div
    class="absolute inset-0 z-[60] bg-theme-surface/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
    transition:fade
  >
    <div
      class="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--eye-off] w-8 h-8 text-amber-500"
      ></span>
    </div>
    <h3
      class="text-xl font-bold text-theme-text uppercase font-header tracking-widest mb-2"
    >
      Protocol Redacted
    </h3>

    <p class="text-xs text-theme-text leading-relaxed max-w-xs">
      This {themeStore.jargon.entity.toLowerCase()} is currently obscured by Fog of
      War. Switch to Admin Mode or remove the
      <code class="text-amber-500">hidden</code>
      tag to decrypt.
    </p>
    <button
      type="button"
      onclick={onClose}
      class="mt-8 px-6 py-2 border border-theme-border text-theme-text hover:text-theme-primary hover:border-theme-primary transition-all text-micro font-bold tracking-widest uppercase font-header"
    >
      Return to Overview
    </button>
  </div>
{/if}

{#snippet headerActions(compact = false)}
  {#if !isEditing}
    <EntityActionBar actions={entityActions.actions} {compact} />
  {/if}
{/snippet}

<div
  class="@container px-4 py-2 md:p-6 border-b border-theme-border bg-theme-surface"
  style:background-color="var(--theme-panel-fill)"
  style:background-image="var(--bg-texture-overlay)"
>
  <div
    class="mb-1 min-w-0 md:mb-2 md:flex md:flex-wrap md:items-center md:justify-between"
  >
    <!-- On phones this is the one top row: back, thumbnail, title, actions. -->
    <div
      class="flex w-full min-w-0 items-center gap-2 md:flex-[1_1_14rem] md:gap-4"
    >
      <button
        type="button"
        onclick={onClose}
        class="touch-target -ml-2 flex shrink-0 items-center justify-center rounded-full p-1 text-theme-text transition hover:text-theme-primary md:hidden"
        aria-label="Back"
      >
        <span aria-hidden="true" class="icon-[lucide--chevron-left] h-7 w-7"
        ></span>
      </button>
      <DetailThumbnail {entity} {isEditing} />
      {#if isEditing}
        <div class="flex flex-col gap-2 w-full mr-4">
          <div class="flex items-center gap-2">
            <input
              type="text"
              bind:value={editTitle}
              class="bg-theme-bg border border-theme-primary text-theme-text px-2 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-xl w-full placeholder-theme-muted"
              placeholder="Entity Title"
            />
            <SaveStatusIndicator />
          </div>
          <AliasInput bind:aliases={editAliases} placeholder="Add alias..." />
        </div>
      {:else}
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h2
              class="{isFantasyTheme
                ? 'text-xl md:text-3xl font-header tracking-wider'
                : 'text-xl md:text-3xl font-body tracking-wide'} max-w-full break-words whitespace-normal font-bold"
              style:color={isFantasyTheme
                ? "var(--theme-title-ink)"
                : undefined}
            >
              {entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                  aria-hidden="true">*</sup
                ><span class="sr-only"> (past)</span>{/if}
            </h2>
            <SaveStatusIndicator />
          </div>
          {#if entity.aliases && entity.aliases.length > 0}
            <div class="flex flex-wrap gap-1 md:gap-1.5 mt-0.5">
              <span
                class="text-nano md:text-nano font-bold text-theme-text uppercase tracking-widest self-center mr-0.5 md:mr-1"
                >aka:</span
              >
              {#each entity.aliases as alias}
                <div
                  class="px-1.5 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-nano md:text-nano font-bold text-theme-text uppercase tracking-wider"
                >
                  {alias}
                </div>
              {/each}
            </div>
          {/if}
          <div
            class="max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3"
          >
            {#if parentEntity}
              <div
                class="flex items-center gap-1.5 text-xs text-theme-text mt-1.5"
                data-testid="sidebar-parent-indicator"
              >
                <span
                  class="icon-[lucide--folder-up] h-3.5 w-3.5 text-theme-muted"
                ></span>
                <span>Parent:</span>
                <button
                  type="button"
                  onclick={handleOpenParent}
                  class="text-theme-text hover:text-theme-primary/80 hover:underline font-semibold focus:outline-none transition-all"
                >
                  {parentEntity.title}{#if parentEntity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                      aria-hidden="true">*</sup
                    ><span class="sr-only"> (past)</span>{/if}
                </button>
                {#if canEditParent}
                  <button
                    type="button"
                    onclick={() => modalUIStore.openParentPicker(entity.id)}
                    class="p-0.5 text-theme-text hover:text-theme-primary transition-colors"
                    aria-label="Change parent"
                    title="Change parent"
                    data-testid="change-parent-button"
                  >
                    <span
                      aria-hidden="true"
                      class="icon-[lucide--pencil] h-3 w-3"
                    ></span>
                  </button>
                {/if}
              </div>
            {:else if canEditParent}
              <div class="mt-1.5">
                <button
                  type="button"
                  onclick={() => modalUIStore.openParentPicker(entity.id)}
                  class="flex items-center gap-1.5 text-xs text-theme-text hover:text-theme-primary transition-colors focus:outline-none"
                  title="Nest this under another entity"
                  data-testid="set-parent-button"
                >
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--folder-plus] h-3.5 w-3.5"
                  ></span>
                  <span>Set parent</span>
                </button>
              </div>
            {/if}
            <DetailGenerateArt {entity} />
          </div>
        </div>
      {/if}
      <div class="shrink-0 md:hidden">{@render headerActions(true)}</div>
    </div>

    <div
      class="ml-2 hidden min-w-0 items-center gap-1.5 md:ml-auto md:flex md:gap-2"
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

  <!-- Labels Section: chips and the add field share one row -->
  <div class="mt-2 mb-1">
    <!-- Phones: one line that scrolls sideways; the add field stays beside it. -->
    <div class="flex items-center gap-1.5 min-h-[24px] md:flex-wrap">
      <div
        class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto max-md:[&>*]:shrink-0 max-md:[&>*]:whitespace-nowrap md:contents"
      >
        {#each entity.labels || [] as label}
          <LabelBadge
            {label}
            removable={!vault.isGuest}
            onRemove={async () => await vault.removeLabel(entity.id, label)}
          />
        {/each}
        {#if statureLabel}
          <span
            class="px-1.5 py-0.5 rounded bg-theme-primary/10 border border-theme-primary/20 text-nano md:text-nano font-bold text-theme-text uppercase tracking-wider self-center"
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
              class="px-1.5 py-0.5 rounded border border-dashed border-theme-primary/30 text-nano md:text-nano font-bold text-theme-text uppercase tracking-wider self-center transition hover:bg-theme-primary/10 disabled:opacity-50"
            >
              Keep
            </button>
          {/if}
        {/if}
        {#if !entity.labels?.length && vault.isGuest}
          <span
            class="text-nano text-theme-text italic uppercase tracking-tighter"
          >
            No labels
          </span>
        {/if}
      </div>
      {#if !vault.isGuest}
        <div
          class="w-32 shrink-0 transition-[width] duration-200 focus-within:w-56 max-w-full"
        >
          <LabelInput entityId={entity.id} />
        </div>
      {/if}
    </div>
  </div>

  {#if !vault.isGuest}
    <StructuralSuggestionBanner entityId={entity.id} />
  {/if}
</div>

<MonsterLabsSendingModal
  open={monsterLabsFlow.open}
  state={monsterLabsFlow.state}
  entityLabel={monsterLabsFlow.entityLabel}
  url={monsterLabsFlow.url}
  onConfirm={monsterLabsFlow.confirm}
  onOpen={monsterLabsFlow.close}
  onClose={monsterLabsFlow.close}
/>
