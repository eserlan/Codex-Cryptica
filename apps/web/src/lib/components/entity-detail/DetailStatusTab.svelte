<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";
  import DetailProposals from "./proposals/DetailProposals.svelte";
  import EntityProposals from "./EntityProposals.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { getTemporalLabel } from "./detail-tabs";

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
  let newConnectionTargetName = $state("");
  let newConnectionTargetId = $state<string | null>(null);
  let newConnectionType = $state("related_to");
  let newConnectionLabel = $state("");
  let addConnectionError = $state<string | null>(null);
  let isConnecting = $state(false);

  async function handleAddConnection() {
    if (!newConnectionTargetId) {
      addConnectionError = "Please select a target entity.";
      return;
    }
    if (newConnectionTargetId === entity.id) {
      addConnectionError = "Cannot connect an entity to itself.";
      return;
    }
    if (isConnecting) return;

    try {
      isConnecting = true;
      const success = await vault.addConnection(
        entity.id,
        newConnectionTargetId,
        newConnectionType,
        newConnectionLabel.trim() || undefined,
      );

      if (success) {
        // Reset state
        isAddingConnection = false;
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
        addConnectionError = null;
      } else {
        addConnectionError = "Failed to add connection.";
      }
    } catch (err: any) {
      addConnectionError = err.message || "Failed to add connection.";
    } finally {
      isConnecting = false;
    }
  }

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  let allConnections = $derived.by(() => {
    if (!entity) return [];

    const checkVisibility = (targetId: string) => {
      const targetEntity = vault.entities[targetId];
      if (!targetEntity) return false;
      if (!vault.isGuest) return true;
      return isEntityVisible(targetEntity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      });
    };

    // ⚡ Bolt Optimization: Replace multiple .map() calls and array spread
    // with imperative loops using .push() to eliminate intermediate array
    // allocations and reduce GC overhead on reactive updates.
    const result = [];

    for (const c of entity.connections) {
      if (checkVisibility(c.target)) {
        result.push({
          ...c,
          isOutbound: true,
          displayTitle: vault.entities[c.target]?.title || c.target,
          targetId: c.target,
          hasPastLabel:
            vault.entities[c.target]?.labels?.some(
              (l) => l.toLowerCase() === "past",
            ) ?? false,
        });
      }
    }

    const inboundList = vault.inboundConnections[entity.id];
    if (inboundList) {
      for (const item of inboundList) {
        if (checkVisibility(item.sourceId)) {
          result.push({
            ...item.connection,
            isOutbound: false,
            displayTitle: vault.entities[item.sourceId]?.title || item.sourceId,
            targetId: item.sourceId,
            hasPastLabel:
              vault.entities[item.sourceId]?.labels?.some(
                (l) => l.toLowerCase() === "past",
              ) ?? false,
          });
        }
      }
    }

    // Add children if exist
    const entityId = entity.id;
    const allEntities = Object.values(vault.entities);
    const children = allEntities.filter(
      (e) => e.parent && e.parent.toLowerCase() === entityId.toLowerCase(),
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (checkVisibility(child.id)) {
        const alreadyConnected = result.some((c) => c.targetId === child.id);
        if (!alreadyConnected) {
          result.push({
            targetId: child.id,
            type: "child",
            label: "Child",
            isOutbound: false,
            isChild: true,
            displayTitle: child.title,
            hasPastLabel:
              child.labels?.some((l) => l.toLowerCase() === "past") ?? false,
          });
        }
      }
    }

    return result;
  });

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  // vault.entities is available to both host and guest sessions (FR-011).
  const entityIndex = $derived<EntityIndexEntry[]>(
    Object.values(vault.entities).flatMap((e) => [
      { text: e.title.toLowerCase(), id: e.id },
      ...(e.aliases || []).map((a) => ({ text: a.toLowerCase(), id: e.id })),
    ]),
  );

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
  const draft = $derived(
    revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );
</script>

<div class="space-y-4 md:space-y-6">
  {#if !isEditing && !vault.isGuest}
    <div class="flex justify-end">
      <button
        type="button"
        onclick={() => modalUIStore.openRelatedEntityDialog(entity.id)}
        class="text-xs font-bold uppercase tracking-widest bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
      >
        <span class="icon-[lucide--sparkles] w-4 h-4"></span>
        Generate Related
      </button>
    </div>
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
          <span class="icon-[lucide--plus] w-3.5 h-3.5"></span>
          ADD
        </button>
      {/if}
    </div>

    {#if isAddingConnection}
      <div
        class="mb-4 p-3 bg-theme-surface border border-theme-primary/30 rounded-md space-y-3 shadow-md"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-bold text-theme-secondary uppercase tracking-widest font-header"
            >New Connection</span
          >
          <button
            type="button"
            onclick={() => {
              isAddingConnection = false;
              newConnectionTargetName = "";
              newConnectionTargetId = null;
              newConnectionType = "related_to";
              newConnectionLabel = "";
              addConnectionError = null;
            }}
            class="text-theme-muted hover:text-theme-text"
            aria-label="Cancel adding connection"
          >
            <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
          </button>
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-target"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Target Entity</label
          >
          <Autocomplete
            bind:value={newConnectionTargetName}
            bind:selectedId={newConnectionTargetId}
            placeholder="Search entities..."
            id="new-connection-target"
            ariaLabel="Search target entity"
          />
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-type"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Relationship Type</label
          >
          <select
            id="new-connection-type"
            bind:value={newConnectionType}
            class="w-full bg-theme-bg text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
          >
            <option value="related_to">Default (Grey)</option>
            <option value="neutral">Neutral (Amber)</option>
            <option value="friendly">Friendly (Blue)</option>
            <option value="enemy">Enemy (Red)</option>
          </select>
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-label"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Custom Label (Optional)</label
          >
          <input
            id="new-connection-label"
            type="text"
            bind:value={newConnectionLabel}
            placeholder="e.g. Ally, Rivalling, Secret"
            class="w-full bg-theme-bg text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
          />
        </div>

        {#if addConnectionError}
          <p class="text-xs text-theme-danger font-semibold">
            {addConnectionError}
          </p>
        {/if}

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onclick={() => {
              isAddingConnection = false;
              newConnectionTargetName = "";
              newConnectionTargetId = null;
              newConnectionType = "related_to";
              newConnectionLabel = "";
              addConnectionError = null;
            }}
            class="text-[10px] font-bold text-theme-muted hover:text-theme-text tracking-wider uppercase px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isConnecting}
            onclick={handleAddConnection}
            class="text-[10px] bg-theme-primary text-theme-bg font-bold tracking-wider uppercase px-3 py-1.5 rounded hover:bg-theme-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
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
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >Child</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                {:else if conn.isOutbound}
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                {:else}
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                {/if}
              </button>

              {#if !vault.isGuest}
                <div class="flex items-center gap-1">
                  {#if conn.isOutbound && !conn.isChild}
                    <button
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => (editingConnectionTarget = conn.targetId)}
                      aria-label="Edit connection"
                      title="Edit connection"
                    >
                      <span class="icon-[lucide--pencil] w-3 h-3"></span>
                    </button>
                  {/if}
                  {#if conn.isChild}
                    <button
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => {
                        isAddingConnection = true;
                        newConnectionTargetId = conn.targetId;
                        newConnectionTargetName = conn.displayTitle;
                        newConnectionType = "related_to";
                        newConnectionLabel = "";
                      }}
                      aria-label="Establish custom connection"
                      title="Establish custom connection"
                    >
                      <span class="icon-[lucide--plus] w-3 h-3"></span>
                    </button>
                  {/if}
                  <button
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
                    aria-label="Delete connection"
                    title="Delete connection"
                  >
                    <span class="icon-[lucide--trash-2] w-3 h-3"></span>
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
  <EntityProposals content={entity.content || ""} {isEditing} />
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
