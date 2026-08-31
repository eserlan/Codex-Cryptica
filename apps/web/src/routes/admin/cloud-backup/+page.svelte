<script lang="ts">
  /**
   * Operator-only aggregate view over Cloud Backup (spec 162, issue #2593).
   *
   * Deliberately thin: it calls the same `/api/cloud-backup/admin/stats` route
   * described in `docs/deployment/cloud-backup-support-access.md` and renders
   * exactly what that route returns — counts and a byte total, never a title,
   * a backup id, or any per-vault detail. There is nothing here to browse,
   * because the worker route it calls has nothing to browse either (FR-016).
   *
   * The admin token is kept in component state only — never written to
   * localStorage/sessionStorage — so it does not linger on this device after
   * the tab closes.
   */
  let token = $state("");
  let loading = $state(false);
  let error = $state("");
  let stats = $state<{
    vaultCount: number;
    assetCount: number;
    totalBytes: number;
    complete: boolean;
  } | null>(null);

  const baseUrl =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_ORACLE_PROXY_URL) ||
    (typeof import.meta !== "undefined" &&
    import.meta.env?.DEV &&
    !import.meta.env?.VITEST
      ? "http://localhost:8787"
      : "https://oracle-proxy.espen-erlandsen.workers.dev");

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / 1024 ** exponent;
    return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
  }

  async function loadStats() {
    if (!token.trim()) return;
    loading = true;
    error = "";
    stats = null;
    try {
      const response = await fetch(`${baseUrl}/api/cloud-backup/admin/stats`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (!response.ok) {
        error =
          response.status === 404
            ? "Not found — wrong token, or the admin route isn't configured."
            : `Request failed (${response.status}).`;
        return;
      }
      stats = await response.json();
    } catch {
      error = "Could not reach the worker.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Cloud Backup — Admin Stats</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-16 font-mono text-sm">
  <h1 class="mb-1 text-lg font-bold tracking-wide">
    Cloud Backup — Admin Stats
  </h1>
  <p class="mb-6 text-xs text-theme-muted">
    Aggregate counts only — no vault titles, no content, no images. See
    <code>docs/deployment/cloud-backup-support-access.md</code> for what this token
    can and cannot do.
  </p>

  <form
    class="flex gap-2"
    onsubmit={(event) => {
      event.preventDefault();
      void loadStats();
    }}
  >
    <input
      type="password"
      bind:value={token}
      placeholder="Admin token"
      autocomplete="off"
      class="flex-1 rounded border border-theme-border bg-theme-bg px-3 py-2 text-theme-text placeholder-theme-muted focus:border-theme-primary focus:outline-none"
    />
    <button
      type="submit"
      disabled={loading || !token.trim()}
      class="rounded bg-theme-primary px-4 py-2 font-bold text-theme-bg disabled:opacity-50"
    >
      {loading ? "Loading…" : "Load"}
    </button>
  </form>

  {#if error}
    <p class="mt-4 text-theme-danger" data-testid="admin-stats-error">
      {error}
    </p>
  {/if}

  {#if stats}
    <dl
      class="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2"
      data-testid="admin-stats-results"
    >
      <dt class="text-theme-muted">Vaults</dt>
      <dd>{stats.vaultCount}</dd>
      <dt class="text-theme-muted">Assets</dt>
      <dd>{stats.assetCount}</dd>
      <dt class="text-theme-muted">Total storage</dt>
      <dd>{formatBytes(stats.totalBytes)}</dd>
      <dt class="text-theme-muted">Scan complete</dt>
      <dd>{stats.complete ? "Yes" : "No — bucket exceeds scan cap"}</dd>
    </dl>
  {/if}
</div>
