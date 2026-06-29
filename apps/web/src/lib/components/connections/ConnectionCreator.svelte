<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";

  let {
    entityId,
    initialTargetId = null,
    initialTargetName = "",
    onCancel,
    onConnectionAdded,
  } = $props<{
    entityId: string;
    initialTargetId?: string | null;
    initialTargetName?: string;
    onCancel: () => void;
    onConnectionAdded: () => void;
  }>();

  let newConnectionTargetName = $state("");
  let newConnectionTargetId = $state<string | null>(null);

  $effect(() => {
    newConnectionTargetName = initialTargetName;
    newConnectionTargetId = initialTargetId;
  });
  let newConnectionType = $state("related_to");
  let newConnectionLabel = $state("");
  let addConnectionError = $state<string | null>(null);
  let isConnecting = $state(false);

  async function handleAddConnection() {
    if (!newConnectionTargetId) {
      addConnectionError = "Please select a target entity.";
      return;
    }
    if (newConnectionTargetId === entityId) {
      addConnectionError = "Cannot connect an entity to itself.";
      return;
    }
    if (isConnecting) return;

    try {
      isConnecting = true;
      const success = await vault.addConnection(
        entityId,
        newConnectionTargetId,
        newConnectionType,
        newConnectionLabel.trim() || undefined,
      );

      if (success) {
        // Reset state
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
        addConnectionError = null;
        onConnectionAdded();
      } else {
        addConnectionError = "Failed to add connection.";
      }
    } catch (err: any) {
      addConnectionError = err.message || "Failed to add connection.";
    } finally {
      isConnecting = false;
    }
  }
</script>

<div
  class="mb-4 p-3 bg-theme-surface border border-theme-primary/30 rounded-md space-y-3 shadow-md"
>
  <div class="flex items-center justify-between">
    <span
      class="text-[10px] font-bold text-theme-secondary uppercase tracking-widest font-header"
      >New Connection</span
    >
    <button
      type="button"
      onclick={() => {
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
        addConnectionError = null;
        onCancel();
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
      for="new-connection-label"
      class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
      >Custom Label (Optional)</label
    >
    <input
      id="new-connection-label"
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
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
        addConnectionError = null;
        onCancel();
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