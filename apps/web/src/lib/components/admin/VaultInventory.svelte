<script lang="ts">
  /**
   * Operator vault inventory (spec 162, FR-024), rendered by `/admin/vaults`: what is stored in R2, as two
   * tables — private Cloud Backups and published vaults. Metadata only: the
   * worker routes never return content, owner-code hashes or write tokens.
   *
   * Like `/admin/cloud-backup`, the admin token lives in component state only
   * and is never written to storage.
   */
  import {
    VaultInventoryError,
    VaultInventoryService,
    formatLastActive,
    formatMegabytes,
    sortVaults,
    summarise,
    type SortDirection,
    type VaultInventoryKind,
    type VaultInventoryRow,
    type VaultSortKey,
  } from "$lib/services/admin/vault-inventory";

  let {
    service = new VaultInventoryService(),
  }: { service?: VaultInventoryService } = $props();

  const tabs: { kind: VaultInventoryKind; label: string }[] = [
    { kind: "backups", label: "Cloud Backups" },
    { kind: "published", label: "Published" },
  ];
  const columns: { key: VaultSortKey; label: string; numeric: boolean }[] = [
    { key: "title", label: "Vault", numeric: false },
    { key: "sizeBytes", label: "Size", numeric: true },
    { key: "entityCount", label: "Entities", numeric: true },
    { key: "lastActiveAt", label: "Last active", numeric: false },
  ];

  let token = $state("");
  let loading = $state(false);
  let error = $state("");
  let loaded = $state(false);
  let activeKind = $state<VaultInventoryKind>("backups");
  let rows = $state<Record<VaultInventoryKind, VaultInventoryRow[]>>({
    backups: [],
    published: [],
  });
  let sortKey = $state<VaultSortKey>("lastActiveAt");
  let sortDirection = $state<SortDirection>("desc");

  const visible = $derived(
    sortVaults(rows[activeKind], sortKey, sortDirection),
  );
  const totals = $derived(summarise(rows[activeKind]));

  async function load() {
    const secret = token.trim();
    if (!secret || loading) return;
    loading = true;
    error = "";
    loaded = false;
    rows = { backups: [], published: [] };
    try {
      await Promise.all(
        tabs.map(({ kind }) =>
          service.fetchAll(kind, secret, (page) => (rows[kind] = page)),
        ),
      );
      loaded = true;
    } catch (cause) {
      error =
        cause instanceof VaultInventoryError
          ? cause.message
          : "Could not load the inventory.";
    } finally {
      loading = false;
    }
  }

  function sortBy(key: VaultSortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = key === "title" ? "asc" : "desc";
    }
  }

  const statusLabels = {
    disable: { label: "Disabled", tone: "text-theme-danger" },
    delist: { label: "Delisted", tone: "text-theme-warning" },
    live: { label: "Live", tone: "text-theme-muted" },
  };

  function ariaSort(key: VaultSortKey) {
    if (sortKey !== key) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }
</script>

{#snippet tokenForm()}
  <form
    class="flex max-w-md gap-2"
    onsubmit={(event) => {
      event.preventDefault();
      void load();
    }}
  >
    <input
      type="password"
      bind:value={token}
      placeholder="Admin token"
      aria-label="Admin token"
      autocomplete="off"
      class="flex-1 rounded border border-theme-border bg-theme-bg px-3 py-2 text-theme-text placeholder-theme-muted focus:border-theme-primary focus:outline-none"
    />
    <button
      type="submit"
      disabled={loading || !token.trim()}
      class="rounded bg-theme-primary px-4 py-2 font-bold text-theme-on-primary disabled:opacity-50"
    >
      {loading ? "Loading…" : "Load"}
    </button>
  </form>
{/snippet}

{#snippet viewToggle()}
  <div class="mt-8 flex gap-1 border-b border-theme-border">
    {#each tabs as tab (tab.kind)}
      {@const active = activeKind === tab.kind}
      <button
        type="button"
        aria-pressed={active}
        class="-mb-px border-b-2 px-3 py-2 font-bold {active
          ? 'border-theme-primary text-theme-primary'
          : 'border-transparent text-theme-muted hover:text-theme-text'}"
        onclick={() => (activeKind = tab.kind)}
      >
        {tab.label} ({rows[tab.kind].length})
      </button>
    {/each}
  </div>
{/snippet}

{#snippet sortHeader(column: (typeof columns)[number])}
  <th
    scope="col"
    aria-sort={ariaSort(column.key)}
    class="px-2 py-2 {column.numeric ? 'text-right' : ''}"
  >
    <button
      type="button"
      class="inline-flex items-center gap-1 font-bold hover:text-theme-text"
      onclick={() => sortBy(column.key)}
    >
      {column.label}
      {#if sortKey === column.key}
        <span
          class="{sortDirection === 'asc'
            ? 'icon-[lucide--chevron-up]'
            : 'icon-[lucide--chevron-down]'} h-3 w-3"
          aria-hidden="true"
        ></span>
      {/if}
    </button>
  </th>
{/snippet}

{#snippet vaultRow(vault: VaultInventoryRow)}
  {@const status = statusLabels[vault.suspension ?? "live"]}
  <tr class="border-b border-theme-border/40" data-testid="inventory-row">
    <td class="px-2 py-2">
      <div class="font-bold">{vault.title}</div>
      <div class="text-xs text-theme-muted">{vault.id}</div>
    </td>
    <td class="px-2 py-2 text-right whitespace-nowrap">
      {formatMegabytes(vault.sizeBytes)}
    </td>
    <td class="px-2 py-2 text-right">{vault.entityCount ?? "—"}</td>
    <td class="px-2 py-2 whitespace-nowrap">
      {formatLastActive(vault.lastActiveAt)}
    </td>
    {#if activeKind === "published"}
      <td class="px-2 py-2"><span class={status.tone}>{status.label}</span></td>
    {/if}
  </tr>
{/snippet}

{#snippet inventoryTable()}
  <div class="mt-3 overflow-x-auto">
    <table class="w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-theme-border text-xs text-theme-muted">
          {#each columns as column (column.key)}
            {@render sortHeader(column)}
          {/each}
          {#if activeKind === "published"}
            <th scope="col" class="px-2 py-2 font-bold">Status</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each visible as vault (vault.id)}
          {@render vaultRow(vault)}
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<div class="mx-auto max-w-5xl px-4 py-12 font-mono text-sm text-theme-text">
  <h1 class="mb-1 text-lg font-bold tracking-wide">Vault Inventory</h1>
  <p class="mb-6 text-xs text-theme-muted">
    What is stored in R2: titles, sizes, entity counts and last activity. No
    content. Users are told about this list on the Cloud Backup consent screen.
    See <code>docs/deployment/cloud-backup-support-access.md</code>.
  </p>

  {@render tokenForm()}

  {#if error}
    <p
      class="mt-4 text-theme-danger"
      role="alert"
      data-testid="inventory-error"
    >
      {error}
    </p>
  {/if}

  {#if loaded || loading}
    {@render viewToggle()}
    <p class="mt-3 text-xs text-theme-muted" data-testid="inventory-summary">
      {totals.count} vaults · {formatMegabytes(totals.totalBytes)} · {totals.totalEntities}
      entities{loading ? " · loading…" : ""}
    </p>
    {#if visible.length === 0 && !loading}
      <p class="mt-6 text-theme-muted">Nothing stored here yet.</p>
    {:else}
      {@render inventoryTable()}
    {/if}
  {/if}
</div>
