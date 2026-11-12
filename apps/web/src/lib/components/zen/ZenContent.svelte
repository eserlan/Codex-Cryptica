<script lang="ts">
  import { vault } from "#lib/stores/vault.svelte.js";
  import type { EntityIndexEntry } from "#lib/utils/entity-mention-detector.js";
  import HelpZenDetailSurface from "#lib/components/help-assistant/HelpZenDetailSurface.svelte";
  import MarkdownEditor from "#lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "#lib/components/timeline/TemporalEditor.svelte";
  import { revisionService } from "#lib/services/RevisionService.svelte.js";
  import DetailProposals from "#lib/components/entity-detail/proposals/DetailProposals.svelte";
  import GenerateRelatedButton from "#lib/components/entity-detail/GenerateRelatedButton.svelte";
  import EntityProposals from "#lib/components/entity-detail/EntityProposals.svelte";
  import ZenConnections from "./ZenConnections.svelte";
  import DelveCanvasBlock from "#lib/components/entity-detail/DelveCanvasBlock.svelte";
  import EntityGmNotes from "#lib/components/entity-detail/EntityGmNotes.svelte";
  import { getTemporalLabel } from "#lib/components/entity-detail/detail-tabs.js";
  import { isEntityVisible, type Entity } from "schema";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { isDelveLocationEntity } from "#lib/services/dungeon-delve-service.js";

  let {
    entity,
    editState = $bindable(),
    scrollContainer = $bindable(),
    onNavigate = () => {},
    isPopout = false,
  }: {
    entity: Entity | null;
    editState: any;
    scrollContainer: HTMLDivElement | undefined;
    onNavigate?: (id: string) => void;
    isPopout?: boolean;
  } = $props();

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!entity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });
  import { calendarEngine } from "chronology-engine";
  import { calendarStore } from "#lib/stores/calendar.svelte.js";

  const formatDate = (date: any) => {
    if (!date || date.year === undefined) return "";
    try {
      return calendarEngine.format(date, calendarStore.config);
    } catch {
      if (date.label) return date.label;
      const parts = [];
      if (date.day !== undefined)
        parts.push(date.day.toString().padStart(2, "0"));
      if (date.month !== undefined)
        parts.push(date.month.toString().padStart(2, "0"));
      parts.push(date.year.toString());
      return parts.join("/");
    }
  };

  const draft = $derived(
    entity && revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  // ⚡ Bolt Optimization: Use the pre-cached titleAndAliasIndex with an imperative loop
  // to avoid intermediate array allocations from Object.values().flatMap()
  const entityIndex = $derived.by<EntityIndexEntry[]>(() => {
    const index = vault.titleAndAliasIndex;
    const result: EntityIndexEntry[] = [];
    for (let i = 0; i < index.length; i++) {
      result.push({ text: index[i].lowercaseText, id: index[i].entityId });
    }
    return result;
  });
</script>

<div
  bind:this={scrollContainer}
  class="flex-1 p-4 md:p-6 md:overflow-y-auto custom-scrollbar bg-theme-bg"
  style="background-image: var(--bg-texture-overlay)"
  data-testid="zen-content"
>
  <HelpZenDetailSurface {entity} isEditing={editState.isEditing} />
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Temporal Data -->
    {#if editState.isEditing}
      <div class="bg-theme-surface p-4 rounded border border-theme-border">
        <h3
          class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest mb-3"
        >
          Timeline Configuration
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TemporalEditor
            bind:value={editState.startDate}
            label={getTemporalLabel(
              editState?.type ?? entity?.type ?? "",
              "start",
            )}
            referenceValue={editState.endDate}
          />
          <TemporalEditor
            bind:value={editState.endDate}
            label={getTemporalLabel(
              editState?.type ?? entity?.type ?? "",
              "end",
            )}
            referenceValue={editState.startDate}
          />
        </div>
      </div>
    {:else if entity?.date || entity?.start_date || entity?.end_date}
      <div
        class="flex flex-wrap gap-8 p-4 bg-theme-primary/5 border border-theme-border rounded"
      >
        {#if entity?.date}
          <div class="flex flex-col">
            <span
              class="text-xs text-theme-secondary font-bold tracking-widest mb-1 uppercase font-header"
            >
              {getTemporalLabel(entity?.type || "", "start")}
            </span>
            <span class="text-lg font-header text-theme-primary"
              >{formatDate(entity?.date)}</span
            >
          </div>
        {:else}
          {#if entity?.start_date}
            <div class="flex flex-col">
              <span
                class="text-xs text-theme-secondary font-bold tracking-widest mb-1 uppercase font-header"
              >
                {getTemporalLabel(entity?.type || "", "start")}
              </span>
              <span class="text-lg font-header text-theme-primary"
                >{formatDate(entity?.start_date)}</span
              >
            </div>
          {/if}
          {#if entity?.end_date}
            <div class="flex flex-col">
              <span
                class="text-xs text-theme-secondary font-bold tracking-widest mb-1 uppercase font-header"
              >
                {getTemporalLabel(entity?.type || "", "end")}
              </span>
              <span class="text-lg font-header text-theme-primary"
                >{formatDate(entity?.end_date)}</span
              >
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Chronicle -->
    {#if editState.isEditing || isVisible}
      <div data-testid="entity-main-text">
        {#if editState.isEditing}
          <MarkdownEditor
            content={editState.content}
            editable={true}
            onUpdate={(md) => (editState.content = md)}
          />
        {:else if isVisible}
          <div
            class="prose-container {draft
              ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 p-3 -m-3 rounded-lg relative overflow-hidden'
              : ''}"
          >
            {#if draft}
              <div
                class="absolute top-0 right-0 p-2 text-nano font-bold text-theme-text uppercase tracking-[0.2em]"
              >
                Proposed
              </div>
            {/if}
            <MarkdownEditor
              content={draft
                ? draft.chronicle
                : entity?.content || "No records found."}
              editable={false}
              {entityIndex}
              currentEntityId={entity?.id ?? ""}
              onEntityClick={(id) => onNavigate(id)}
            />
          </div>
        {:else}
          <div
            class="text-theme-text italic text-sm flex items-center gap-2 py-4"
          >
            <span aria-hidden="true" class="icon-[lucide--lock] w-4 h-4"></span>
            Chronicle is hidden in shared mode
          </div>
        {/if}
      </div>
    {/if}

    {#if entity}
      <EntityGmNotes
        {entity}
        isEditing={editState.isEditing}
        bind:editLore={editState.lore}
        onEntityClick={(id) => onNavigate(id)}
      />
    {/if}

    <ZenConnections {entity} {isPopout} {onNavigate} class="block md:hidden" />

    {#if entity && !editState.isEditing && (!vault.isGuest || (isVisible && isDelveLocationEntity(entity)))}
      <div class="space-y-4" data-testid="entity-overview-tools">
        {#if !vault.isGuest}
          <div class="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onclick={() => modalUIStore.openRevisionDialog(entity.id)}
              disabled={revisionService.isRevising}
              class="text-xs font-bold uppercase tracking-widest bg-theme-surface text-theme-text border border-theme-primary/50 hover:bg-theme-primary/10 hover:border-theme-primary px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Revise Chronicle and Lore with AI"
              title="Revise Chronicle and Lore with AI"
            >
              {#if revisionService.isRevising}
                <span
                  aria-hidden="true"
                  class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
                ></span>
                Revising
              {:else}
                <span aria-hidden="true" class="icon-[lucide--sparkles] w-4 h-4"
                ></span>
                AI Revise
              {/if}
            </button>
            <GenerateRelatedButton entityId={entity.id} />
          </div>
        {/if}
        {#if isVisible && isDelveLocationEntity(entity)}
          <DelveCanvasBlock {entity} />
        {/if}
      </div>
    {/if}

    <DetailProposals isEditing={editState.isEditing} entityId={entity?.id} />
    <EntityProposals
      content={entity?.content || ""}
      isEditing={editState.isEditing}
      entityId={entity?.id}
    />
  </div>
</div>

<style>
  /* Images inside an entity's text stay a comfortable size in the reading view. */
  .prose-container :global(img) {
    max-width: 100%;
    max-height: 16rem;
    width: auto;
    height: auto;
    object-fit: contain;
  }
</style>
