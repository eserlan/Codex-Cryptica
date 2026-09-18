<script lang="ts">
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Entity } from "schema";
  import type { ConnectionListItem } from "./zen-connections";

  interface Props {
    conn: ConnectionListItem;
    entity: Entity | null | undefined;
    isEditing: boolean;
    onStartEditing: () => void;
    onStopEditing: () => void;
    onOpenChild: (conn: ConnectionListItem) => void;
    onDelete: (conn: ConnectionListItem) => void;
    onNavigate: (id: string) => void;
  }

  let {
    conn,
    entity,
    isEditing,
    onStartEditing,
    onStopEditing,
    onOpenChild,
    onDelete,
    onNavigate,
  }: Props = $props();
</script>

<!-- fallow-ignore-next-line complexity -->
{#if isEditing && conn.isOutbound && !conn.isChild}
  <div class="p-1">
    <ConnectionEditor
      sourceId={entity?.id || ""}
      connection={{
        target: conn.id,
        type: conn.type,
        strength: conn.strength ?? 1,
        label: conn.rawLabel || "",
      }}
      onSave={onStopEditing}
      onCancel={onStopEditing}
    />
  </div>
{:else}
  <div
    class="[content-visibility:auto] [contain-intrinsic-size:0_44px] w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
  >
    <button
      type="button"
      onclick={() => onNavigate(conn.id)}
      class="flex-1 min-w-0 flex items-center gap-3 text-left"
    >
      <span
        aria-hidden="true"
        class="w-1.5 h-1.5 rounded-full shrink-0 {conn.isChild
          ? 'bg-emerald-500'
          : conn.isOutbound
            ? 'bg-theme-primary'
            : 'bg-blue-500'}"
      ></span>
      <span class="sr-only"
        >{conn.isChild
          ? "Child of this entity:"
          : conn.isOutbound
            ? "Outgoing connection:"
            : "Incoming connection:"}</span
      >
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
            onclick={onStartEditing}
            class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
            aria-label="Edit connection to {conn.title}"
            title="Edit connection"
          >
            <span aria-hidden="true" class="icon-[lucide--pencil] w-3.5 h-3.5"
            ></span>
          </button>
        {/if}
        {#if conn.isChild}
          <button
            type="button"
            onclick={() => onOpenChild(conn)}
            class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
            aria-label="Establish custom connection to {conn.title}"
            title="Establish custom connection"
          >
            <span aria-hidden="true" class="icon-[lucide--plus] w-3.5 h-3.5"
            ></span>
          </button>
        {/if}
        <button
          type="button"
          onclick={() => onDelete(conn)}
          class="text-theme-muted hover:text-theme-danger transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
          aria-label="Delete connection to {conn.title}"
          title="Delete connection"
        >
          <span aria-hidden="true" class="icon-[lucide--trash-2] w-3.5 h-3.5"
          ></span>
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
