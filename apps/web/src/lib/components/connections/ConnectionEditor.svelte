<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import type { Connection } from "schema";

  let { sourceId, connection, onSave, onCancel } = $props<{
    sourceId: string;
    connection: Connection;
    onSave: () => void;
    onCancel: () => void;
  }>();

  let type = $state(connection.type);
  let label = $state(connection.label || "");

  const options = [
    { value: "neutral", label: "Neutral (Grey)" },
    { value: "friendly", label: "Friendly (Green)" },
    { value: "enemy", label: "Enemy (Red)" },
    { value: "related_to", label: "Related To (Grey)" },
    { value: "located_in", label: "Located In (Grey)" },
    { value: "knows", label: "Knows (Grey)" },
    { value: "owns", label: "Owns (Grey)" },
    { value: "part_of", label: "Part Of (Grey)" },
    { value: "secret_advisor", label: "Secret Advisor (Grey)" },
  ];

  const handleSave = () => {
    vault.updateConnection(sourceId, connection.target, {
      type,
      label: label.trim() || undefined,
    });
    onSave();
  };
</script>

<div class="p-3 bg-theme-bg border border-theme-primary rounded-md space-y-3">
  <div>
    <label class="block text-xs font-bold text-theme-secondary mb-1">RELATIONSHIP TYPE</label>
    <select
      bind:value={type}
      class="w-full bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1 text-sm focus:outline-none focus:border-theme-primary"
    >
      {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  <div>
    <label class="block text-xs font-bold text-theme-secondary mb-1">CUSTOM LABEL (Optional)</label>
    <input
      type="text"
      bind:value={label}
      placeholder="e.g. Brother, Rival, Employer"
      class="w-full bg-theme-surface text-theme-text border border-theme-border rounded px-2 py-1 text-sm focus:outline-none focus:border-theme-primary"
    />
  </div>

  <div class="flex justify-end gap-2 pt-1">
    <button
      onclick={onCancel}
      class="text-xs text-theme-muted hover:text-theme-text px-3 py-1"
    >
      CANCEL
    </button>
    <button
      onclick={handleSave}
      class="text-xs bg-theme-primary text-theme-bg font-bold px-3 py-1 rounded hover:bg-theme-secondary"
    >
      SAVE
    </button>
  </div>
</div>
