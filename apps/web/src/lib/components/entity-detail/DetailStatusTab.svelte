<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import ConnectionCreator from "$lib/components/connections/ConnectionCreator.svelte";
  import DetailProposals from "./proposals/DetailProposals.svelte";
  import EntityProposals from "./EntityProposals.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { getTemporalLabel } from "./detail-tabs";
  import {
    buildConnectionNeighbors,
    toConnectionRows,
    vaultConnectionContext,
  } from "./entity-connections";
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
    isEditing,
    editType,
    editContent = $bindable(),
    editStartDate = $bindable(),
    editEndDate = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editType: string;
    editContent: string;
    editStartDate: Entity["start_date"];
    editEndDate: Entity["end_date"];
  }>();

  let editingConnectionTarget = $state<string | null>(null);

  let isAddingConnection = $state(false);
  let prefillConnectionTargetId = $state<string | null>(null);
  let prefillConnectionTargetName = $state("");

  // The "*" suffix on a name marks a past-labelled entity. It's a purely
  // visual footnote with no legend anywhere in the app, so the `sr-only`
  // spans below pair it with text. Other surfaces rendering the same marker
  // (DetailHeader, NodeReadModal, EntityListItem, MapPinPopover, PinLinker,
  // TokenAddDialog) do the same.
  const entityIsPast = $derived(
    entity?.labels?.some((l: string) => l.toLowerCase() === "past") ?? false,
  );

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  // The Status list and the Connections tab (issue #2350) read the same
  // 1-hop set from `entity-connections`, so a rule added to one surface can't
  // silently skip the other. `toConnectionRows` keeps the per-relationship
  // row shape this list edits (and hands to ConnectionEditor).
  let allConnections = $derived.by(() => {
    if (!entity) return [];
    return toConnectionRows(
      buildConnectionNeighbors(entity, vaultConnectionContext(vault)),
    );
  });

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  // vault.titleAndAliasIndex is available to both host and guest sessions (FR-011).
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

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
  const draft = $derived(
    revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );

  const existingCanvas = $derived.by(() => {
    if (!entity) return undefined;
    return canvasRegistry.findCanvasForEntity(entity.id, entity.title);
  });

  const delveCanvasLabel = $derived(
    getDelveCanvasLabel(themeStore.activeTheme.id),
  );
</script>

<div class="space-y-4 md:space-y-6">
  {#if !isEditing}
    {#if !vault.isGuest}
      <div class="flex justify-end">
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
  {/if}
  <!-- Temporal Metadata -->
  {#if isEditing}
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TemporalEditor
          bind:value={editStartDate}
          label={getTemporalLabel(editType, "start")}
          referenceValue={editEndDate}
        />
        <TemporalEditor
          bind:value={editEndDate}
          label={getTemporalLabel(editType, "end")}
          referenceValue={editStartDate}
        />
      </div>
    </div>
  {/if}
  <!-- Chronicle -->
  {#if isEditing || isVisible}
    <div>
      {#if !isEditing && isDelveLocationEntity(entity)}
        <div
          class="mb-4 p-3 bg-theme-primary/5 border border-theme-border rounded-xl flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2.5">
            <span class="icon-[lucide--map] text-theme-primary w-5 h-5 shrink-0"
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
                <span class="icon-[lucide--rotate-cw] w-3.5 h-3.5"></span>
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

      <div
        class="prose-content {draft
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
        {#if !isVisible && vault.isGuest}
          <div
            class="text-theme-muted italic text-sm flex items-center gap-2 py-4"
          >
            <span class="icon-[lucide--lock] w-4 h-4"></span>
            Chronicle is hidden in shared mode
          </div>
        {:else}
          <MarkdownEditor
            content={isEditing
              ? editContent
              : draft
                ? draft.chronicle
                : entity.content || "No content yet."}
            editable={isEditing && !draft}
            onUpdate={(val) => {
              if (isEditing) editContent = val;
            }}
            entityIndex={isEditing ? [] : entityIndex}
            currentEntityId={entity.id}
            onEntityClick={(id) => {
              vault.selectedEntityId = id;
            }}
          />
        {/if}
      </div>
    </div>
  {/if}

  <!-- Connections -->
  <div>
    <div
      class="flex items-center justify-between border-b border-theme-border pb-1 mb-3"
      style:border-color={isFantasyTheme
        ? "var(--theme-selected-border)"
        : undefined}
    >
      <h3
        class="font-header text-lg {isFantasyTheme
          ? 'uppercase tracking-[0.16em] text-sm font-bold'
          : 'italic'}"
        style:color="var(--theme-section-title)"
      >
        {themeStore.jargon.connections_header}
      </h3>
      {#if !vault.isGuest && !isAddingConnection}
        <button
          type="button"
          onclick={() => (isAddingConnection = true)}
          class="text-xs font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition"
          aria-label="Add new connection"
        >
          <span aria-hidden="true" class="icon-[lucide--plus] w-3.5 h-3.5"
          ></span>
          ADD
        </button>
      {/if}
    </div>

    {#if isAddingConnection}
      <ConnectionCreator
        entityId={entity.id}
        initialTargetId={prefillConnectionTargetId}
        initialTargetName={prefillConnectionTargetName}
        onCancel={() => {
          isAddingConnection = false;
          prefillConnectionTargetId = null;
          prefillConnectionTargetName = "";
        }}
        onConnectionAdded={() => {
          isAddingConnection = false;
          prefillConnectionTargetId = null;
          prefillConnectionTargetName = "";
        }}
      />
    {/if}

    <ul class="space-y-3">
      {#each allConnections as conn}
        {#if editingConnectionTarget === conn.targetId && conn.isOutbound && !conn.isChild}
          <li>
            <ConnectionEditor
              sourceId={entity.id}
              connection={conn}
              onSave={() => (editingConnectionTarget = null)}
              onCancel={() => (editingConnectionTarget = null)}
            />
          </li>
        {:else}
          <li class="flex gap-3 text-sm text-theme-muted items-start group">
            <span
              aria-hidden="true"
              class="mt-1 w-3 h-3 shrink-0 {conn.isChild
                ? 'icon-[lucide--chevron-down]'
                : conn.isOutbound
                  ? 'icon-[lucide--arrow-up-right]'
                  : 'icon-[lucide--arrow-down-left]'}"
              style:color={conn.isChild
                ? "#10b981"
                : conn.isOutbound
                  ? "var(--theme-icon-active)"
                  : "var(--theme-icon-default)"}
            ></span>
            <span class="sr-only"
              >{conn.isChild
                ? "Child of this entity:"
                : conn.isOutbound
                  ? "Outgoing connection:"
                  : "Incoming connection:"}</span
            >
            <div class="flex-1 min-w-0 flex justify-between items-start gap-2">
              <button
                onclick={(e) => {
                  layoutUIStore.setLastSelectedNodePosition({
                    x: e.clientX,
                    y: e.clientY,
                  });
                  vault.selectedEntityId = conn.targetId;
                }}
                class="text-left hover:text-theme-primary transition flex items-center flex-wrap gap-y-1"
              >
                {#if conn.isChild}
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup
                        aria-hidden="true">*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >Child</strong
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entityIsPast}<sup aria-hidden="true"
                        >*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                {:else if conn.isOutbound}
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entityIsPast}<sup aria-hidden="true"
                        >*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup
                        aria-hidden="true">*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                {:else}
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup
                        aria-hidden="true">*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span
                    aria-hidden="true"
                    class="relation-arrow icon-[lucide--move-right]"
                  ></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entityIsPast}<sup aria-hidden="true"
                        >*</sup
                      ><span class="sr-only"> (past)</span>{/if}</span
                  >
                {/if}
              </button>

              {#if !vault.isGuest}
                <div class="flex items-center gap-1">
                  {#if conn.isOutbound && !conn.isChild}
                    <button
                      type="button"
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => (editingConnectionTarget = conn.targetId)}
                      aria-label="Edit connection to {conn.displayTitle}"
                      title="Edit connection"
                    >
                      <span
                        aria-hidden="true"
                        class="icon-[lucide--pencil] w-3 h-3"
                      ></span>
                    </button>
                  {/if}
                  {#if conn.isChild}
                    <button
                      type="button"
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => {
                        prefillConnectionTargetId = conn.targetId;
                        prefillConnectionTargetName = conn.displayTitle;
                        isAddingConnection = true;
                      }}
                      aria-label="Establish custom connection to {conn.displayTitle}"
                      title="Establish custom connection"
                    >
                      <span
                        aria-hidden="true"
                        class="icon-[lucide--plus] w-3 h-3"
                      ></span>
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="text-theme-muted hover:text-theme-danger transition p-1"
                    onclick={() => {
                      if (conn.isChild) {
                        vault.updateEntity(conn.targetId, {
                          parent: undefined,
                        });
                      } else if (conn.isOutbound) {
                        vault.removeConnection(
                          entity.id,
                          conn.targetId,
                          conn.type,
                        );
                      } else {
                        vault.removeConnection(
                          conn.targetId,
                          entity.id,
                          conn.type,
                        );
                      }
                    }}
                    aria-label="Delete connection to {conn.displayTitle}"
                    title="Delete connection"
                  >
                    <span
                      aria-hidden="true"
                      class="icon-[lucide--trash-2] w-3 h-3"
                    ></span>
                  </button>
                </div>
              {/if}
            </div>
          </li>
        {/if}
      {/each}
      {#if allConnections.length === 0}
        <li class="text-sm text-theme-muted italic">No known connections.</li>
      {/if}
    </ul>
  </div>

  <DetailProposals {isEditing} />
  <EntityProposals
    content={entity.content || ""}
    {isEditing}
    entityId={entity.id}
  />
</div>

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }

  .relation-arrow {
    color: var(--theme-icon-active);
    width: 1.1rem;
    height: 1.1rem;
    display: inline-block;
    vertical-align: middle;
    margin: 0 0.4rem;
    flex-shrink: 0;
  }
</style>
