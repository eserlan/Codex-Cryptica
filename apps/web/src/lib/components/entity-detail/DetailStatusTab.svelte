<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";
  import DetailProposals from "./proposals/DetailProposals.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { regenerationService } from "$lib/services/RegenerationService.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

  import { calendarEngine } from "chronology-engine";
  import { calendarStore } from "$lib/stores/calendar.svelte";

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

  const getTemporalLabel = (type: string, field: "date" | "start" | "end") => {
    const t = type.toLowerCase();
    if (field === "date") return "Occurrence";
    if (field === "start") {
      if (
        ["npc", "creature", "character", "monster"].some((x) => t.includes(x))
      )
        return "Born";
      if (
        ["faction", "location", "city", "organization", "guild"].some((x) =>
          t.includes(x),
        )
      )
        return "Founded";
      if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
        return "Created";
      return "Started";
    }
    if (field === "end") {
      if (
        ["npc", "creature", "character", "monster"].some((x) => t.includes(x))
      )
        return "Died";
      if (
        ["faction", "location", "city", "organization", "guild"].some((x) =>
          t.includes(x),
        )
      )
        return "Dissolved";
      if (["item", "artifact", "object", "weapon"].some((x) => t.includes(x)))
        return "Destroyed";
      return "Ended";
    }
    return "Date";
  };

  const formatDate = (date: Entity["date"]) => {
    if (!date || date.year === undefined) return "";
    try {
      return calendarEngine.format(date as any, calendarStore.config);
    } catch {
      if (date.label) return date.label;
      let str = `${date.year}`;
      if (date.month !== undefined) str += `/${date.month}`;
      if (date.day !== undefined) str += `/${date.day}`;
      return str;
    }
  };

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
          });
        }
      }
    }

    // Add children if exist
    const entityId = entity.id;
    const allEntities = Object.values(vault.entities);
    const children = allEntities.filter((e) => e.parent === entityId);
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
          });
        }
      }
    }

    return result;
  });

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
  const draft = $derived(
    regenerationService.pendingDraft?.entityId === entity.id
      ? regenerationService.pendingDraft
      : null,
  );
</script>

<div class="space-y-7 md:space-y-9">
  <!-- Temporal Metadata -->
  {#if isEditing}
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TemporalEditor
          bind:value={editStartDate}
          label={getTemporalLabel(editType, "start")}
        />
        <TemporalEditor
          bind:value={editEndDate}
          label={getTemporalLabel(editType, "end")}
        />
      </div>
    </div>
  {:else if entity.date?.year !== undefined || entity.start_date?.year !== undefined || entity.end_date?.year !== undefined}
    <div
      class="flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono border-b border-theme-border pb-4"
      style:border-color={isFantasyTheme
        ? "var(--theme-selected-border)"
        : undefined}
    >
      {#if entity.date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span
            class="font-bold uppercase font-header"
            style:color="var(--theme-section-title)"
            >{getTemporalLabel(entity.type, "date")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.date)}</span>
        </div>
      {/if}
      {#if entity.start_date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span
            class="font-bold uppercase font-header"
            style:color="var(--theme-section-title)"
            >{getTemporalLabel(entity.type, "start")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.start_date)}</span>
        </div>
      {/if}
      {#if entity.end_date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span
            class="font-bold uppercase font-header"
            style:color="var(--theme-section-title)"
            >{getTemporalLabel(entity.type, "end")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.end_date)}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Chronicle -->
  {#if isEditing || isVisible}
    <div>
      <h3
        class="font-header text-lg mb-3 border-b border-theme-border pb-1 {isFantasyTheme
          ? 'uppercase tracking-[0.16em] text-sm'
          : 'italic'}"
        style:color="var(--theme-section-title)"
        style:border-color={isFantasyTheme
          ? "var(--theme-selected-border)"
          : undefined}
      >
        {themeStore.jargon.chronicle_header}
      </h3>
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
        {#if editingConnectionTarget === conn.targetId && conn.isOutbound && !conn.isChild && !conn.isParent}
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
                : conn.isParent
                  ? 'icon-[lucide--chevron-up]'
                  : conn.isOutbound
                    ? 'icon-[lucide--arrow-up-right]'
                    : 'icon-[lucide--arrow-down-left]'}"
              style:color={conn.isChild
                ? "#10b981"
                : conn.isParent
                  ? "#a855f7"
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
                  <span class="text-theme-text">{conn.displayTitle}</span>
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >Child</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary">{entity.title}</span>
                {:else}
                  {#if conn.isParent}
                    <span class="text-theme-text">{conn.displayTitle}</span>
                    <span class="relation-arrow icon-[lucide--move-right]"
                    ></span>
                    <strong
                      class="text-theme-text group-hover:text-theme-primary transition"
                      >Parent</strong
                    >
                    <span class="relation-arrow icon-[lucide--move-right]"
                    ></span>
                    <span class="text-theme-secondary">{entity.title}</span>
                  {:else}
                    {#if conn.isOutbound}
                      <span class="text-theme-secondary">{entity.title}</span>
                      <span class="relation-arrow icon-[lucide--move-right]"
                      ></span>
                      <strong
                        class="text-theme-text group-hover:text-theme-primary transition"
                        >{conn.label || conn.type}</strong
                      >
                      <span class="relation-arrow icon-[lucide--move-right]"
                      ></span>
                      <span class="text-theme-text">{conn.displayTitle}</span>
                    {:else}
                      <span class="text-theme-text">{conn.displayTitle}</span>
                      <span class="relation-arrow icon-[lucide--move-right]"
                      ></span>
                      <strong
                        class="text-theme-text group-hover:text-theme-primary transition"
                        >{conn.label || conn.type}</strong
                      >
                      <span class="relation-arrow icon-[lucide--move-right]"
                      ></span>
                      <span class="text-theme-secondary">{entity.title}</span>
                    {/if}
                  {/if}
                {/if}
              </button>

              {#if !vault.isGuest}
                <div class="flex items-center gap-1">
                  {#if conn.isOutbound && !conn.isChild && !conn.isParent}
                    <button
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => (editingConnectionTarget = conn.targetId)}
                      aria-label="Edit connection"
                      title="Edit connection"
                    >
                      <span class="icon-[lucide--pencil] w-3 h-3"></span>
                    </button>
                  {/if}
                  {#if conn.isChild || conn.isParent}
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
                      } else if (conn.isParent) {
                        vault.updateEntity(entity.id, { parent: undefined });
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
