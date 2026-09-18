<script lang="ts">
  import ConnectionCreator from "$lib/components/connections/ConnectionCreator.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Entity } from "schema";
  import ZenConnectionRow from "./ZenConnectionRow.svelte";
  import {
    buildZenConnections,
    type ConnectionListItem,
  } from "./zen-connections";

  interface Props {
    entity: Entity | null | undefined;
    isPopout?: boolean;
    onNavigate: (id: string) => void;
    class?: string;
  }

  let {
    entity,
    isPopout = false,
    onNavigate,
    class: className = "",
  }: Props = $props();

  let isAddingConnection = $state(false);
  let prefillConnectionTargetId = $state<string | null>(null);
  let prefillConnectionTargetName = $state("");
  let editingConnectionTarget = $state<string | null>(null);

  const allConnections = $derived(buildZenConnections(entity, vault));

  function closeConnectionCreator() {
    isAddingConnection = false;
    prefillConnectionTargetId = null;
    prefillConnectionTargetName = "";
  }

  function handleOpenChildConnection(conn: ConnectionListItem) {
    prefillConnectionTargetId = conn.id;
    prefillConnectionTargetName = conn.title;
    isAddingConnection = true;
  }

  function handleDeleteConnection(conn: ConnectionListItem) {
    const entityId = entity?.id;
    if (!entityId) return;
    if (conn.isChild) {
      vault.updateEntity(conn.id, { parent: undefined });
    } else if (conn.isOutbound) {
      vault.removeConnection(entityId, conn.id, conn.type);
    } else {
      vault.removeConnection(conn.id, entityId, conn.type);
    }
  }
</script>

{#if !(isPopout && vault.isGuest)}
  <div class="space-y-4 pt-6 border-t border-theme-border {className}">
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
          <span aria-hidden="true" class="icon-[lucide--plus] w-3.5 h-3.5"
          ></span>
          ADD
        </button>
      {/if}
    </div>

    {#if isAddingConnection && entity}
      <ConnectionCreator
        entityId={entity.id}
        initialTargetId={prefillConnectionTargetId}
        initialTargetName={prefillConnectionTargetName}
        onCancel={closeConnectionCreator}
        onConnectionAdded={closeConnectionCreator}
      />
    {/if}

    {#if allConnections.length > 0}
      <div class="space-y-2">
        {#each allConnections as conn (conn.key)}
          <ZenConnectionRow
            {conn}
            {entity}
            isEditing={editingConnectionTarget === conn.id}
            onStartEditing={() => (editingConnectionTarget = conn.id)}
            onStopEditing={() => (editingConnectionTarget = null)}
            onOpenChild={handleOpenChildConnection}
            onDelete={handleDeleteConnection}
            {onNavigate}
          />
        {/each}
      </div>
    {:else}
      <p class="text-xs text-theme-muted italic">No known connections.</p>
    {/if}
  </div>
{/if}
