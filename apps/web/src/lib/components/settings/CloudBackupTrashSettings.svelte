<script lang="ts">
  /**
   * The shared trash (shared vault slice 9): what the group deleted in the last
   * `trashRetentionDays` days, and a way to bring each item back.
   */
  import { CLOUD_BACKUP_LIMITS } from "schema";
  import type { CloudBackupTrashItem } from "@codex/cloud-backup-sync";
  import { cloudBackupStore } from "#lib/stores/cloud-backup.svelte.js";
  import { deletedByLabel } from "#lib/stores/cloud-backup-delete-notice.js";

  let { vaultId }: { vaultId: string } = $props();

  const DAY_MS = 24 * 60 * 60 * 1000;
  const maxTrashMb = Math.round(
    CLOUD_BACKUP_LIMITS.maxTrashBytes / (1024 * 1024),
  );
  const trash = cloudBackupStore.trash;
  const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const items = $derived(trash.loadedVaultId === vaultId ? trash.items : []);
  const usedBytes = $derived(
    trash.loadedVaultId === vaultId ? trash.usedBytes : null,
  );
  const maxBytes = $derived(
    trash.loadedVaultId === vaultId ? trash.maxBytes : null,
  );
  const hasEvictedItems = $derived(items.some((item) => !item.restorable));
  const nearCapacity = $derived(
    usedBytes !== null && maxBytes !== null && usedBytes >= maxBytes * 0.8,
  );
  const usageText = $derived(
    usedBytes !== null && maxBytes !== null
      ? `Trash storage: ${formatTrashBytes(usedBytes)} of ${formatTrashBytes(maxBytes)} used`
      : null,
  );
  const warningText = $derived.by(() => {
    if (hasEvictedItems) {
      return `Some older items lost their restorable content because the shared trash reached its ${maxTrashMb} MB limit.`;
    }
    if (nearCapacity) {
      return `Shared trash is nearly full. Deleting more items may remove the oldest restorable content before ${CLOUD_BACKUP_LIMITS.trashRetentionDays} days.`;
    }
    return null;
  });
  const loadState = $derived(trash.loadState);
  const isEmpty = $derived(loadState === "ready" && items.length === 0);

  function formatTrashBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1).replace(/\.0$/, "")} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
  }

  $effect(() => {
    if (vaultId) void trash.load(vaultId);
  });

  function deletedAgo(deletedAt: string): string {
    const minutes = Math.round((Date.parse(deletedAt) - Date.now()) / 60_000);
    if (!Number.isFinite(minutes)) return "";
    if (Math.abs(minutes) < 60)
      return ago.format(Math.min(minutes, 0), "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return ago.format(hours, "hour");
    return ago.format(Math.round(hours / 24), "day");
  }

  function daysLeft(deletedAt: string): number {
    const end =
      Date.parse(deletedAt) + CLOUD_BACKUP_LIMITS.trashRetentionDays * DAY_MS;
    return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
  }

  const resultText = $derived.by(() => {
    if (trash.resultVaultId !== vaultId) return null;
    const result = trash.result;
    if (!result) return null;
    if (result.outcome === "restored") return `Restored ${result.title}`;
    return result.outcome === "gone"
      ? `${result.title} can no longer be restored.`
      : `Couldn't restore ${result.title}. Try again.`;
  });

  const buttonClass =
    "min-h-11 border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-text transition-colors hover:text-theme-text disabled:opacity-50";

  function kindLabel(kind: CloudBackupTrashItem["kind"]): string | null {
    if (kind === "map") return "Map";
    if (kind === "canvas") return "Canvas";
    return null;
  }
  function rowMeta(item: CloudBackupTrashItem) {
    const left = daysLeft(item.deletedAt);
    return {
      title: item.title.trim() || "Untitled",
      badge: kindLabel(item.kind),
      summary: `Deleted by ${deletedByLabel(item.deletedBy)}, ${deletedAgo(item.deletedAt)}. ${left} ${left === 1 ? "day" : "days"} left.`,
      isRestoring: trash.restoring.has(item.id),
    };
  }
</script>

{#snippet row(item: CloudBackupTrashItem)}
  {@const meta = rowMeta(item)}
  <li
    class="flex flex-wrap items-center justify-between gap-2 border border-theme-border px-3 py-2"
  >
    <div class="min-w-0">
      <p class="truncate font-semibold">
        {#if meta.badge}
          <span
            class="mr-1 border border-theme-border px-1 text-xs font-bold uppercase tracking-wider text-theme-text"
            >{meta.badge}</span
          >
        {/if}
        {meta.title}
      </p>
      <p class="text-xs">{meta.summary}</p>
      {#if !item.restorable}
        <p class="text-xs">Can't be restored. The trash ran out of space.</p>
      {/if}
    </div>
    {#if item.restorable}
      <button
        type="button"
        class={buttonClass}
        disabled={meta.isRestoring}
        aria-label="Restore {meta.title}"
        onclick={() => trash.restore(vaultId, [item.id])}
      >
        {meta.isRestoring ? "Restoring…" : "Restore"}
      </button>
    {/if}
  </li>
{/snippet}

{#snippet notices()}
  {#if usageText}
    <p class="mt-1 text-xs">{usageText}</p>
  {/if}
  {#if warningText}
    <div
      class="mt-2 flex items-start gap-2 border border-theme-warning/40 bg-theme-warning/10 px-3 py-2 text-xs text-theme-text"
    >
      <span
        class="icon-[lucide--alert-triangle] mt-0.5 h-4 w-4 shrink-0 text-theme-text"
        aria-hidden="true"
      ></span>
      <p>{warningText}</p>
    </div>
  {/if}
{/snippet}

{#if loadState !== "unsupported"}
  <div class="border-t border-theme-border pt-3 text-sm text-theme-text">
    <div class="flex items-center justify-between gap-2">
      <p class="font-semibold">Trash</p>
      <button
        type="button"
        class="{buttonClass} inline-flex items-center gap-1"
        disabled={loadState === "loading"}
        aria-label={loadState === "loading"
          ? "Refreshing the trash"
          : "Refresh the trash"}
        onclick={() => trash.load(vaultId)}
      >
        <span class="icon-[lucide--refresh-cw] h-4 w-4" aria-hidden="true"
        ></span>
        Refresh
      </button>
    </div>
    <p class="mt-1">
      Deleted items stay restorable for up to
      {CLOUD_BACKUP_LIMITS.trashRetentionDays} days, subject to the
      {maxTrashMb} MB trash limit. Any member can restore them.
    </p>
    {@render notices()}

    <p class="mt-2 empty:hidden" role="status">{resultText ?? ""}</p>

    {#if loadState === "failed"}
      <p class="mt-2 text-theme-danger" role="alert">
        Couldn't load the trash. Check your connection and press Refresh.
      </p>
    {:else if isEmpty}
      <p class="mt-2">The trash is empty.</p>
    {:else}
      <ul class="mt-2 flex flex-col gap-2">
        {#each items as item (item.id)}
          {@render row(item)}
        {/each}
      </ul>
    {/if}
  </div>
{/if}
