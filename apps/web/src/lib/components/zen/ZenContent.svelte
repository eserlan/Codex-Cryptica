<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import { themeStore } from "$lib/stores/theme.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import DetailProposals from "$lib/components/entity-detail/proposals/DetailProposals.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import { isEntityVisible, type Entity } from "schema";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let editingConnectionTarget = $state<string | null>(null);
  let isAddingConnection = $state(false);
  let newConnectionTargetName = $state("");
  let newConnectionTargetId = $state<string | null>(null);
  let newConnectionType = $state("related_to");
  let newConnectionLabel = $state("");
  let addConnectionError = $state<string | null>(null);
  let isConnecting = $state(false);

  const handleAddConnection = async () => {
    addConnectionError = null;
    if (!entity) return;
    if (!newConnectionTargetId) {
      addConnectionError = "Please select a valid entity.";
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
        isAddingConnection = false;
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
      } else {
        addConnectionError = "Failed to create connection.";
      }
    } finally {
      isConnecting = false;
    }
  };

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

  interface ConnectionListItem {
    id: string;
    key: string;
    displayLabel: string;
    rawLabel?: string;
    title: string;
    type: string;
    isOutbound: boolean;
    isChild?: boolean;
    isParent?: boolean;
    strength?: number;
  }

  const allConnections = $derived.by(() => {
    if (!entity) return [] as ConnectionListItem[];
    const checkVisibility = (targetId: string) => {
      const targetEntity = vault.entities[targetId];
      if (!targetEntity) return false;
      if (!vault.isGuest) return true;
      return isEntityVisible(targetEntity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      });
    };
    const result: ConnectionListItem[] = [];
    const connections = entity?.connections || [];
    const connectionsLength = connections.length;
    for (let i = 0; i < connectionsLength; i++) {
      const c = connections[i];
      if (checkVisibility(c.target)) {
        result.push({
          id: c.target,
          key: `${c.target}-out-${c.type}-${i}`,
          displayLabel: c.label || c.type,
          rawLabel: c.label,
          title: vault.entities[c.target]?.title || c.target,
          type: c.type,
          isOutbound: true,
          strength: c.strength,
        });
      }
    }
    const inboundConnections = vault.inboundConnections[entity?.id || ""] || [];
    const inboundLength = inboundConnections.length;
    for (let i = 0; i < inboundLength; i++) {
      const item = inboundConnections[i];
      if (checkVisibility(item.sourceId)) {
        result.push({
          id: item.sourceId,
          key: `${item.sourceId}-in-${item.connection.type}-${i}`,
          displayLabel: item.connection.label || item.connection.type,
          rawLabel: item.connection.label,
          title: vault.entities[item.sourceId]?.title || item.sourceId,
          type: item.connection.type,
          isOutbound: false,
          strength: item.connection.strength,
        });
      }
    }

    // Add children if exist
    const entityId = entity?.id || "";
    const allEntities = Object.values(vault.entities);
    const children = allEntities.filter(
      (e) => e.parent && e.parent.toLowerCase() === entityId.toLowerCase(),
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (checkVisibility(child.id)) {
        const alreadyConnected = result.some((c) => c.id === child.id);
        if (!alreadyConnected) {
          result.push({
            id: child.id,
            key: `${child.id}-child-${i}`,
            displayLabel: "Child",
            rawLabel: "Child",
            title: child.title,
            type: "child",
            isOutbound: false,
            isChild: true,
          });
        }
      }
    }

    return result;
  });

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!entity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const getTemporalLabel = (type: string, field: "start" | "end") => {
    const t = (type || "").toLowerCase();
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

    {#if !(isPopout && vault.isGuest)}
      <div class="block md:hidden space-y-4 pt-6 border-t border-theme-border">
        <div
          class="flex items-center justify-between border-b border-theme-border pb-2"
        >
          <h3
            class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest"
          >
            Connections
          </h3>
          {#if !vault.isGuest && !isAddingConnection}
            <button
              type="button"
              onclick={() => (isAddingConnection = true)}
              class="text-[10px] font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition"
              aria-label="Add new connection"
            >
              <span class="icon-[lucide--plus] w-3.5 h-3.5"></span>
              ADD
            </button>
          {/if}
        </div>

        {#if isAddingConnection}
          <div
            class="p-3 bg-theme-bg border border-theme-primary/30 rounded-md space-y-3 shadow-md"
          >
            <div class="flex items-center justify-between">
              <span
                class="text-[10px] font-bold text-theme-secondary uppercase tracking-widest font-header"
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
                for="new-connection-target-mobile"
                class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
                >Target Entity</label
              >
              <Autocomplete
                bind:value={newConnectionTargetName}
                bind:selectedId={newConnectionTargetId}
                placeholder="Search entities..."
                id="new-connection-target-mobile"
                ariaLabel="Search target entity"
              />
            </div>

            <div class="space-y-1">
              <label
                for="new-connection-type-mobile"
                class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
                >Relationship Type</label
              >
              <select
                id="new-connection-type-mobile"
                bind:value={newConnectionType}
                class="w-full bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
              >
                <option value="related_to">Default (Grey)</option>
                <option value="neutral">Neutral (Amber)</option>
                <option value="friendly">Friendly (Blue)</option>
                <option value="enemy">Enemy (Red)</option>
              </select>
            </div>

            <div class="space-y-1">
              <label
                for="new-connection-label-mobile"
                class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
                >Custom Label (Optional)</label
              >
              <input
                id="new-connection-label-mobile"
                type="text"
                bind:value={newConnectionLabel}
                placeholder="e.g. Ally, Rivalling, Secret"
                class="w-full bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
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

        {#if allConnections.length > 0}
          <div class="space-y-2">
            {#each allConnections as conn (conn.key)}
              {#if editingConnectionTarget === conn.id && conn.isOutbound && !conn.isChild}
                <div class="p-1">
                  <ConnectionEditor
                    sourceId={entity?.id || ""}
                    connection={{
                      target: conn.id,
                      type: conn.type,
                      strength: conn.strength ?? 1,
                      label: conn.rawLabel || "",
                    }}
                    onSave={() => (editingConnectionTarget = null)}
                    onCancel={() => (editingConnectionTarget = null)}
                  />
                </div>
              {:else}
                <div
                  class="w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
                >
                  <button
                    type="button"
                    onclick={() => onNavigate(conn.id)}
                    class="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0 {conn.isChild
                        ? 'bg-emerald-500'
                        : conn.isOutbound
                          ? 'bg-theme-primary'
                          : 'bg-blue-500'}"
                    ></span>
                    <div class="flex-1 min-w-0">
                      <div
                        class="text-xs text-theme-muted uppercase tracking-widest font-header"
                      >
                        {conn.displayLabel}
                      </div>
                      <div
                        class="text-sm font-bold text-theme-text group-hover:text-theme-primary truncate transition font-body"
                      >
                        {conn.title}
                      </div>
                    </div>
                  </button>
                  {#if !vault.isGuest}
                    <div class="flex items-center gap-1">
                      {#if conn.isOutbound && !conn.isChild}
                        <button
                          type="button"
                          onclick={() => (editingConnectionTarget = conn.id)}
                          class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                          aria-label="Edit connection"
                          title="Edit connection"
                        >
                          <span class="icon-[lucide--pencil] w-3.5 h-3.5"
                          ></span>
                        </button>
                      {/if}
                      {#if conn.isChild}
                        <button
                          type="button"
                          onclick={() => {
                            isAddingConnection = true;
                            newConnectionTargetId = conn.id;
                            newConnectionTargetName = conn.title;
                            newConnectionType = "related_to";
                            newConnectionLabel = "";
                          }}
                          class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                          aria-label="Establish custom connection"
                          title="Establish custom connection"
                        >
                          <span class="icon-[lucide--plus] w-3.5 h-3.5"></span>
                        </button>
                      {/if}
                      <button
                        type="button"
                        onclick={() => {
                          const entityId = entity?.id;
                          if (!entityId) return;
                          if (conn.isChild) {
                            vault.updateEntity(conn.id, { parent: undefined });
                          } else if (conn.isOutbound) {
                            vault.removeConnection(
                              entityId,
                              conn.id,
                              conn.type,
                            );
                          } else {
                            vault.removeConnection(
                              conn.id,
                              entityId,
                              conn.type,
                            );
                          }
                        }}
                        class="text-theme-muted hover:text-theme-danger transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                        aria-label="Delete connection"
                        title="Delete connection"
                      >
                        <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                      </button>
                    </div>
                  {/if}
                  <button
                    type="button"
                    onclick={() => onNavigate(conn.id)}
                    class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary group-focus-within:text-theme-primary focus-visible:text-theme-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition shrink-0"
                    aria-label="Navigate to {conn.title}"
                  ></button>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="text-xs text-theme-muted italic">No known connections.</p>
        {/if}
      </div>
    {/if}

    <DetailProposals isEditing={editState.isEditing} entityId={entity?.id} />
  </div>
</div>
