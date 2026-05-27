<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import { regenerationService } from "$lib/services/RegenerationService.svelte";
  import DetailProposals from "$lib/components/entity-detail/proposals/DetailProposals.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import { isEntityVisible, type Entity } from "schema";

  let editingConnectionTarget = $state<string | null>(null);

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
    label: string;
    title: string;
    type: string;
    isOutbound: boolean;
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
          label: c.label || c.type,
          title: vault.entities[c.target]?.title || c.target,
          type: c.type,
          isOutbound: true,
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
          label: item.connection.label || item.connection.type,
          title: vault.entities[item.sourceId]?.title || item.sourceId,
          type: item.connection.type,
          isOutbound: false,
        });
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

  const formatDate = (date: any) => {
    if (!date || date.year === undefined) return "";
    if (date.label) return date.label;
    let str = `${date.year}`;
    if (date.month !== undefined) str += `/${date.month}`;
    if (date.day !== undefined) str += `/${date.day}`;
    return str;
  };

  const draft = $derived(
    entity && regenerationService.pendingDraft?.entityId === entity.id
      ? regenerationService.pendingDraft
      : null,
  );
</script>

<div
  bind:this={scrollContainer}
  class="flex-1 p-4 md:p-6 md:overflow-y-auto custom-scrollbar bg-theme-bg"
  style="background-image: var(--bg-texture-overlay)"
  data-testid="zen-content"
>
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
          />
          <TemporalEditor
            bind:value={editState.endDate}
            label={getTemporalLabel(
              editState?.type ?? entity?.type ?? "",
              "end",
            )}
          />
        </div>
      </div>
    {:else if entity?.start_date || entity?.end_date}
      <div
        class="flex flex-wrap gap-8 p-4 bg-theme-primary/5 border border-theme-border rounded"
      >
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
            />
          </div>
        {/if}
      </div>
    {/if}

    {#if !(isPopout && vault.isGuest)}
      <div class="block md:hidden space-y-4 pt-6 border-t border-theme-border">
        <h3
          class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest border-b border-theme-border pb-2"
        >
          Connections
        </h3>
        {#if allConnections.length > 0}
          <div class="space-y-2">
            {#each allConnections as conn (conn.key)}
              {#if editingConnectionTarget === conn.id && conn.isOutbound}
                <div class="p-1">
                  <ConnectionEditor
                    sourceId={entity?.id || ""}
                    connection={{
                      target: conn.id,
                      type: conn.type,
                      label: conn.label || "",
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
                      class="w-1.5 h-1.5 rounded-full shrink-0 {conn.isOutbound
                        ? 'bg-theme-primary'
                        : 'bg-blue-500'}"
                    ></span>
                    <div class="flex-1 min-w-0">
                      <div
                        class="text-xs text-theme-muted uppercase tracking-widest font-header"
                      >
                        {conn.label}
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
                      {#if conn.isOutbound}
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
                      <button
                        type="button"
                        onclick={() => {
                          const entityId = entity?.id;
                          if (!entityId) return;
                          if (conn.isOutbound) {
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
