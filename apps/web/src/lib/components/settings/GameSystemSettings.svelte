<script lang="ts">
  /**
   * Vault-wide game system (#3943). The choice is stored in the vault's
   * `.codex/config.json` and sets which system generators default to and which
   * stat sheets are suggested first. Entities keep the sheets they already have.
   */
  import {
    gameSystemRegistry,
    SYSTEM_NEUTRAL_ID,
    type GameSystemRegistry,
  } from "schema";
  import { systemProfileStore } from "#lib/stores/system-profile.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

  let {
    store = systemProfileStore,
    registry = gameSystemRegistry,
    notify = (message: string) => notificationStore.notify(message, "error"),
  }: {
    store?: Pick<
      typeof systemProfileStore,
      "vaultSystemId" | "isLoading" | "setVaultSystemId"
    >;
    registry?: Pick<GameSystemRegistry, "list" | "get">;
    notify?: (message: string) => void;
  } = $props();

  let isSaving = $state(false);

  const profiles = $derived(registry.list());
  const selectedId = $derived(store.vaultSystemId ?? SYSTEM_NEUTRAL_ID);
  const selected = $derived(registry.get(selectedId));

  async function handleChange(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    if (isSaving) return;
    isSaving = true;
    try {
      const value = select.value === SYSTEM_NEUTRAL_ID ? null : select.value;
      const saved = await store.setVaultSystemId(value);
      // The store restores the previous system itself, so the select follows.
      if (!saved) notify("Could not save the game system. Please try again.");
    } finally {
      isSaving = false;
    }
  }
</script>

<div
  class="bg-chrome-bg/50 border border-chrome-border p-4 rounded-lg space-y-3"
  data-testid="game-system-settings"
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1">
      <label
        for="vault-game-system"
        class="block text-sm font-bold text-chrome-text mb-1 uppercase font-header"
        >Default Game System</label
      >
      <p
        id="vault-game-system-help"
        class="text-meta text-chrome-muted leading-relaxed"
      >
        Generators default to this system, and its stat sheets are suggested
        first. Existing entities keep their sheets.
      </p>
    </div>
    <select
      id="vault-game-system"
      value={selectedId}
      onchange={handleChange}
      disabled={isSaving || store.isLoading}
      aria-describedby="vault-game-system-help"
      class="bg-chrome-surface border border-chrome-border text-chrome-text px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-chrome-text rounded disabled:opacity-60"
    >
      {#each profiles as profile (profile.id)}
        <option value={profile.id}>{profile.label}</option>
      {/each}
    </select>
  </div>

  {#if selected.description}
    <p class="text-meta text-chrome-muted leading-relaxed">
      {selected.description}
    </p>
  {/if}
  {#if selected.provenance}
    <p
      class="text-meta text-chrome-muted leading-relaxed border-t border-chrome-border/30 pt-3"
      data-testid="game-system-attribution"
    >
      {selected.provenance.attribution ??
        `Rules licensed under ${selected.provenance.license}.`}
      <a
        href={selected.provenance.source}
        target="_blank"
        rel="noopener noreferrer"
        class="text-chrome-text underline">Source</a
      >
    </p>
  {/if}
</div>
