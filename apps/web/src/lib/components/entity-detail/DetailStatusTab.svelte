<script lang="ts">
  import type { Entity, Connection } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";

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
    if (date.label) return date.label;
    let str = `${date.year}`;
    if (date.month !== undefined) str += `/${date.month}`;
    if (date.day !== undefined) str += `/${date.day}`;
    return str;
  };

  let allConnections = $derived.by(() => {
    if (!entity) return [];
    const outbound = entity.connections.map((c: Connection) => ({
      ...c,
      isOutbound: true,
      displayTitle: vault.entities[c.target]?.title || c.target,
      targetId: c.target,
    }));
    const inbound = (vault.inboundConnections[entity.id] || []).map((item) => ({
      ...item.connection,
      isOutbound: false,
      displayTitle: vault.entities[item.sourceId]?.title || item.sourceId,
      targetId: item.sourceId,
    }));
    return [...outbound, ...inbound];
  });
</script>

<div class="space-y-6 md:space-y-8">
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
    >
      {#if entity.date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span class="text-theme-primary font-bold uppercase"
            >{getTemporalLabel(entity.type, "date")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.date)}</span>
        </div>
      {/if}
      {#if entity.start_date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span class="text-theme-primary font-bold uppercase"
            >{getTemporalLabel(entity.type, "start")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.start_date)}</span>
        </div>
      {/if}
      {#if entity.end_date?.year !== undefined}
        <div class="flex items-baseline gap-2">
          <span class="text-theme-primary font-bold uppercase"
            >{getTemporalLabel(entity.type, "end")}:</span
          >
          <span class="text-theme-text">{formatDate(entity.end_date)}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Chronicle -->
  <div>
    <h3
      class="text-theme-secondary font-serif italic text-lg mb-3 border-b border-theme-border pb-1"
    >
      Chronicle
    </h3>
    <div class="prose-content">
      <MarkdownEditor
        content={isEditing ? editContent : entity.content || "No content yet."}
        editable={isEditing}
        onUpdate={(val) => (editContent = val)}
      />
    </div>
  </div>

  <!-- Connections -->
  <div>
    <h3
      class="text-theme-secondary font-serif italic text-lg mb-3 border-b border-theme-border pb-1"
    >
      Gossip & Secrets
    </h3>
    <ul class="space-y-3">
      {#each allConnections as conn}
        {#if editingConnectionTarget === conn.targetId && conn.isOutbound}
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
              class="mt-1 w-3 h-3 shrink-0 {conn.isOutbound
                ? 'text-theme-primary icon-[lucide--arrow-up-right]'
                : 'text-blue-500 icon-[lucide--arrow-down-left]'}"
            ></span>
            <div class="flex-1 min-w-0 flex justify-between items-start gap-2">
              <button
                onclick={() => (vault.selectedEntityId = conn.targetId)}
                class="text-left hover:text-theme-primary transition flex items-center flex-wrap gap-y-1"
              >
                {#if conn.isOutbound}
                  <span class="text-theme-secondary">{entity.title}</span>
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-text">{conn.displayTitle}</span>
                {:else}
                  <span class="text-theme-text">{conn.displayTitle}</span>
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary">{entity.title}</span>
                {/if}
              </button>

              {#if conn.isOutbound && !vault.isGuest}
                <button
                  class="text-theme-muted hover:text-theme-primary transition p-1"
                  onclick={() => (editingConnectionTarget = conn.targetId)}
                  aria-label="Edit connection"
                >
                  <span class="icon-[lucide--pencil] w-3 h-3"></span>
                </button>
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
</div>

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }

  .relation-arrow {
    color: #22c55e;
    width: 1.1rem;
    height: 1.1rem;
    display: inline-block;
    vertical-align: middle;
    margin: 0 0.4rem;
    flex-shrink: 0;
  }
</style>
