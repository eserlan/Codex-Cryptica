<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import { themeStore } from "$lib/stores/theme.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import DetailProposals from "$lib/components/entity-detail/proposals/DetailProposals.svelte";
  import EntityProposals from "$lib/components/entity-detail/EntityProposals.svelte";
  import ZenConnections from "./ZenConnections.svelte";
  import { getTemporalLabel } from "$lib/components/entity-detail/detail-tabs";
  import { isEntityVisible, type Entity } from "schema";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import {
    dungeonDelveService,
    isDelveLocationEntity,
  } from "$lib/services/dungeon-delve-service";
  import { goto } from "$app/navigation";
  import { openCanvasFromZen } from "$lib/stores/ui/navigation";
  import { getDelveCanvasLabel } from "$lib/utils/delve-terminology";

  let {
    entity,
    editState = $bindable(),
    scrollContainer = $bindable(),
    onNavigate = () => {},
    isPopout = false,
  } = $props<{
    entity: Entity | null;
    editState: any;
    scrollContainer: HTMLDivElement | undefined;
    onNavigate?: (id: string) => void;
    isPopout?: boolean;
  }>();

  const existingCanvas = $derived.by(() => {
    if (!entity) return undefined;
    return canvasRegistry.findCanvasForEntity(entity.id, entity.title);
  });

  const delveCanvasLabel = $derived(
    getDelveCanvasLabel(themeStore.activeTheme.id),
  );
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
  import { calendarStore } from "$lib/stores/calendar.svelte";

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
  <div class="max-w-3xl mx-auto space-y-6">
    {#if entity && !editState.isEditing && !vault.isGuest}
      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onclick={() => modalUIStore.openRevisionDialog(entity.id)}
          disabled={revisionService.isRevising}
          class="text-xs font-bold uppercase tracking-widest bg-theme-surface text-theme-primary border border-theme-primary/50 hover:bg-theme-primary/10 hover:border-theme-primary px-4 py-2 rounded-xl flex items-center gap-1.5 transition disabled:cursor-not-allowed disabled:opacity-50"
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
        <button
          type="button"
          onclick={() => modalUIStore.openGeneratorWorkflowForEntity(entity.id)}
          class="text-xs font-bold uppercase tracking-widest bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
        >
          <span class="icon-[lucide--sparkles] w-4 h-4"></span>
          Generate Related
        </button>
      </div>
    {/if}
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
      <div>
        <h2
          class="text-xl font-header font-bold text-theme-primary mb-2 flex items-center gap-2 border-b border-theme-border pb-2"
        >
          <span class="icon-[lucide--book-open] w-5 h-5"></span>
          {themeStore.jargon.chronicle_header}
        </h2>
        {#if !editState.isEditing && entity && isDelveLocationEntity(entity)}
          <div
            class="my-3 p-3 bg-theme-primary/5 border border-theme-border rounded-xl flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="icon-[lucide--map] text-theme-primary w-5 h-5 shrink-0"
              ></span>
              <div>
                <span
                  class="text-xs font-bold text-theme-primary uppercase font-header tracking-wider block"
                >
                  Spatial {delveCanvasLabel}
                </span>
                <span class="text-[10px] text-theme-muted">
                  {existingCanvas
                    ? "Interactive room & sector floor plan on Spatial Canvas."
                    : "Generate an interactive room & sector floor plan on Spatial Canvas."}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if existingCanvas}
                <button
                  type="button"
                  onclick={() => {
                    openCanvasFromZen(existingCanvas, goto);
                  }}
                  class="px-3.5 py-1.5 bg-theme-primary text-theme-bg font-bold text-[10px] rounded-lg uppercase font-header tracking-widest hover:bg-theme-secondary transition-colors shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span class="icon-[lucide--external-link] w-3.5 h-3.5"></span>
                  Open {delveCanvasLabel}
                </button>
                <button
                  type="button"
                  title="Rebuild Canvas Map"
                  aria-label="Rebuild Canvas Map"
                  onclick={async () => {
                    try {
                      const canvasDoc =
                        dungeonDelveService.buildDelveCanvasFromConcept(entity);
                      const slug = await canvasRegistry.importCanvas(canvasDoc);
                      openCanvasFromZen({ slug }, goto);
                    } catch (err) {
                      console.error("[DelveCanvas] Rebuild failed:", err);
                    }
                  }}
                  class="p-1.5 text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                >
                  <span
                    class="icon-[lucide--rotate-cw] w-3.5 h-3.5"
                    aria-hidden="true"
                  ></span>
                </button>
              {:else}
                <button
                  type="button"
                  onclick={async () => {
                    try {
                      const canvasDoc =
                        dungeonDelveService.buildDelveCanvasFromConcept(entity);
                      const slug = await canvasRegistry.importCanvas(canvasDoc);
                      openCanvasFromZen({ slug }, goto);
                    } catch (err) {
                      console.error("[DelveCanvas] Build failed:", err);
                    }
                  }}
                  class="px-3.5 py-1.5 bg-theme-primary text-theme-bg font-bold text-[10px] rounded-lg uppercase font-header tracking-widest hover:bg-theme-secondary transition-colors shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span class="icon-[lucide--map] w-3.5 h-3.5"></span>
                  Build {delveCanvasLabel}
                </button>
              {/if}
            </div>
          </div>
        {/if}
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
                class="absolute top-0 right-0 p-2 text-[8px] font-bold text-theme-primary uppercase tracking-[0.2em]"
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
            class="text-theme-muted italic text-sm flex items-center gap-2 py-4"
          >
            <span class="icon-[lucide--lock] w-4 h-4"></span>
            Chronicle is hidden in shared mode
          </div>
        {/if}
      </div>
    {/if}

    {#if !vault.isGuest && (editState.isEditing || entity?.lore || draft !== null)}
      <div>
        <h2
          class="text-xl font-header font-bold text-theme-primary mb-2 flex items-center gap-2 border-b border-theme-border pb-2"
        >
          <span class="icon-[lucide--scroll-text] w-5 h-5"></span>
          {themeStore.jargon.lore_header}
        </h2>
        {#if editState.isEditing}
          <MarkdownEditor
            content={editState.lore}
            editable={true}
            onUpdate={(md) => (editState.lore = md)}
          />
        {:else}
          <div
            class="prose-container {draft
              ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 p-3 -m-3 rounded-lg relative overflow-hidden'
              : ''}"
          >
            {#if draft}
              <div
                class="absolute top-0 right-0 p-2 text-[8px] font-bold text-theme-primary uppercase tracking-[0.2em]"
              >
                Proposed
              </div>
            {/if}
            <MarkdownEditor
              content={draft
                ? draft.lore
                : entity?.lore || "No detailed lore available."}
              editable={false}
              {entityIndex}
              currentEntityId={entity?.id ?? ""}
              onEntityClick={(id) => onNavigate(id)}
            />
          </div>
        {/if}
      </div>
    {/if}

    <ZenConnections {entity} {isPopout} {onNavigate} class="block md:hidden" />

    <DetailProposals isEditing={editState.isEditing} entityId={entity?.id} />
    <EntityProposals
      content={entity?.content || ""}
      isEditing={editState.isEditing}
      entityId={entity?.id}
    />
  </div>
</div>
