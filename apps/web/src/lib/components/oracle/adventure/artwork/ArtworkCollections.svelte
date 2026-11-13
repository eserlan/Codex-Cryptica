<script lang="ts">
  import type { CollectionDownloadResult } from "#lib/services/adventure/artwork/collection-downloads.js";

  export interface CollectionPackItem {
    id: string;
    title: string;
    credits: string;
    declaredBytes: number;
    assetCount: number;
    installed: boolean;
    verifiedOffline: boolean;
    incomplete?: boolean;
  }

  let {
    collections,
    automaticCacheBytes = 0,
    privateSnapshotBytes = 0,
    onInstall,
    onRemove,
    onClearAutomaticCache,
  }: {
    collections: readonly CollectionPackItem[];
    automaticCacheBytes?: number;
    privateSnapshotBytes?: number;
    onInstall: (
      id: string,
      signal: AbortSignal,
      onProgress: (completed: number, total: number) => void,
    ) => Promise<CollectionDownloadResult>;
    onRemove: (id: string) => Promise<void>;
    onClearAutomaticCache?: () => Promise<void>;
  } = $props();

  let activeDownloads = $state<
    Record<
      string,
      { controller: AbortController; completed: number; total: number }
    >
  >({});
  let statusMessages = $state<Record<string, string>>({});
  let sessionVerified = $state<Record<string, boolean>>({});
  let busyId = $state<string | null>(null);

  function formatMegabytes(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function startDownload(id: string) {
    const controller = new AbortController();
    activeDownloads = {
      ...activeDownloads,
      [id]: { controller, completed: 0, total: 0 },
    };
    const nextMessages = { ...statusMessages };
    delete nextMessages[id];
    statusMessages = nextMessages;

    try {
      const result = await onInstall(
        id,
        controller.signal,
        (completed, total) => {
          const current = activeDownloads[id];
          if (!current) return;
          activeDownloads = {
            ...activeDownloads,
            [id]: { ...current, completed, total },
          };
        },
      );

      if (result.status === "installed") {
        sessionVerified = { ...sessionVerified, [id]: true };
        statusMessages = {
          ...statusMessages,
          [id]: "Installed and verified offline.",
        };
      } else if (result.status === "cancelled") {
        statusMessages = {
          ...statusMessages,
          [id]: "Download cancelled. Completed files were kept.",
        };
      } else if (result.status === "capacity") {
        statusMessages = {
          ...statusMessages,
          [id]: "Not enough offline storage. Remove an installed pack first.",
        };
      } else if (result.status === "incomplete") {
        statusMessages = {
          ...statusMessages,
          [id]: `Incomplete (${result.completed} / ${result.total} files). Retry to resume.`,
        };
      } else {
        statusMessages = {
          ...statusMessages,
          [id]: "Offline storage is unavailable right now.",
        };
      }
    } finally {
      const rest = { ...activeDownloads };
      delete rest[id];
      activeDownloads = rest;
    }
  }

  function cancelDownload(id: string) {
    activeDownloads[id]?.controller.abort();
  }

  async function removePack(id: string) {
    busyId = id;
    try {
      await onRemove(id);
      const nextVerified = { ...sessionVerified };
      delete nextVerified[id];
      sessionVerified = nextVerified;
      const nextMessages = { ...statusMessages };
      delete nextMessages[id];
      statusMessages = nextMessages;
    } finally {
      busyId = null;
    }
  }

  function isPackVerified(pack: CollectionPackItem): boolean {
    return (
      Boolean(sessionVerified[pack.id]) ||
      (pack.installed && pack.verifiedOffline)
    );
  }

  function downloadActionLabel(
    pack: CollectionPackItem,
    message: string | undefined,
  ): string {
    const isRetry = Boolean(message && !message.includes("Not enough"));
    return isRetry ? `Retry ${pack.title}` : `Download ${pack.title}`;
  }
</script>

{#snippet storageSummary()}
  <div class="space-y-1 text-xs text-theme-text">
    <p>Private Vault snapshots: {formatMegabytes(privateSnapshotBytes)}</p>
    <div class="flex flex-wrap items-center gap-2">
      <span
        >Disposable public cache: {formatMegabytes(automaticCacheBytes)}</span
      >
      {#if onClearAutomaticCache}
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-0.5 text-xs text-theme-text hover:bg-theme-bg"
          onclick={() => void onClearAutomaticCache()}
        >
          Clear public cache
        </button>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet packStatus(pack: CollectionPackItem, isVerified: boolean)}
  {#if isVerified}
    <p class="text-xs text-theme-text">Installed and verified offline</p>
  {:else if pack.installed}
    <p class="text-xs text-theme-warning">
      Installed, but some cached files need re-verification
    </p>
  {/if}
{/snippet}

{#snippet packActions(
  pack: CollectionPackItem,
  isVerified: boolean,
  message: string | undefined,
)}
  {@const downloading = activeDownloads[pack.id]}
  <div class="flex items-center gap-2">
    {#if downloading}
      <span class="text-xs text-theme-text">
        {downloading.completed} / {downloading.total} files
      </span>
      <button
        type="button"
        class="rounded border border-theme-border px-2.5 py-1 text-xs text-theme-text hover:bg-theme-bg"
        onclick={() => cancelDownload(pack.id)}
      >
        Cancel download
      </button>
    {:else if isVerified}
      <button
        type="button"
        disabled={busyId === pack.id}
        class="rounded border border-theme-border px-2.5 py-1 text-xs text-theme-text hover:bg-theme-bg disabled:opacity-50"
        onclick={() => void removePack(pack.id)}
      >
        Remove {pack.title}
      </button>
    {:else}
      <button
        type="button"
        class="rounded border border-theme-border px-2.5 py-1 text-xs text-theme-text hover:bg-theme-bg"
        onclick={() => void startDownload(pack.id)}
      >
        {downloadActionLabel(pack, message)}
      </button>
    {/if}
  </div>
{/snippet}

{#snippet packRow(pack: CollectionPackItem)}
  {@const isVerified = isPackVerified(pack)}
  {@const message = statusMessages[pack.id]}
  <li class="rounded border border-theme-border p-2.5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="space-y-0.5">
        <p class="text-sm font-medium text-theme-text">{pack.title}</p>
        <p class="text-xs text-theme-text">
          {pack.assetCount} illustrations · {formatMegabytes(
            pack.declaredBytes,
          )} · {pack.credits}
        </p>
        {@render packStatus(pack, isVerified)}
      </div>
      {@render packActions(pack, isVerified, message)}
    </div>
    {#if message && !isVerified}
      <p role="status" class="mt-1.5 text-xs text-theme-text">
        {message}
      </p>
    {/if}
  </li>
{/snippet}

<section
  class="mt-3 space-y-3 rounded-lg border border-theme-border bg-theme-surface p-3"
  aria-label="Offline artwork collections"
>
  <div class="space-y-1">
    <h3 class="text-sm font-medium text-theme-text">Offline artwork packs</h3>
    <p class="text-xs text-theme-text">
      Explicitly downloaded packs stay available offline even when automatic
      illustrations are turned off.
    </p>
  </div>

  {@render storageSummary()}

  <ul class="space-y-2">
    {#each collections as pack (pack.id)}
      {@render packRow(pack)}
    {/each}
  </ul>
</section>
