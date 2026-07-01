<script lang="ts">
  import { resolve } from "$app/paths";

  interface DirectoryResult {
    publishId: string;
    guestUrl: string;
    title: string;
    description: string;
    labels: string[];
    coverImageUrl?: string;
    coverImageAlt?: string;
    ownerDisplayName?: string;
    visibleEntityCount: number;
    listingUpdatedAt: string;
  }

  interface Props {
    data: {
      page: { results: DirectoryResult[]; nextCursor?: string };
      query: { q: string; labels: string[] };
      error?: string;
    };
  }

  let { data }: Props = $props();
  let labelsText = $derived(data.query.labels.join(", "));

  let viewMode = $state<"grid" | "list">("grid");

  $effect(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("cc_directory_view_mode");
      if (saved === "grid" || saved === "list") {
        viewMode = saved;
      }
    }
  });

  function setViewMode(mode: "grid" | "list") {
    viewMode = mode;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("cc_directory_view_mode", mode);
    }
  }
</script>

<svelte:head>
  <title>Public Worlds | Codex Cryptica</title>
  <meta
    name="description"
    content="Browse player-safe public worlds shared from Codex Cryptica."
  />
</svelte:head>

<div class="min-h-screen bg-theme-bg text-theme-text">
  <div class="mx-auto max-w-6xl px-6 py-12 space-y-8">
    <header class="space-y-3">
      <p
        class="text-xs font-header uppercase tracking-widest text-theme-primary"
      >
        Public Worlds
      </p>
      <h1 class="text-4xl font-header font-bold text-theme-text">
        Browse shared guest worlds
      </h1>
      <p class="max-w-2xl text-sm leading-relaxed text-theme-text/70">
        Every result opens the read-only guest view. Private notes, editor
        state, and write access stay out of this directory.
      </p>
    </header>

    <form method="GET" class="grid gap-4 md:grid-cols-[2fr_1fr_auto]">
      <label class="space-y-1">
        <span
          class="text-xs font-header uppercase tracking-wider text-theme-text/60"
          >Search</span
        >
        <input
          name="q"
          value={data.query.q}
          type="search"
          placeholder="Search titles or descriptions"
          class="min-h-12 w-full rounded border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
        />
      </label>

      <label class="space-y-1">
        <span
          class="text-xs font-header uppercase tracking-wider text-theme-text/60"
          >Labels</span
        >
        <input
          name="labels"
          value={labelsText}
          type="text"
          placeholder="cyberpunk, intrigue"
          class="min-h-12 w-full rounded border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
        />
      </label>

      <div class="flex items-end gap-2">
        <button
          type="submit"
          class="min-h-12 rounded bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
        >
          Search
        </button>
        <a
          href={resolve("/worlds")}
          class="min-h-12 rounded border border-theme-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-text inline-flex items-center"
        >
          Clear
        </a>
      </div>
    </form>

    {#if data.error}
      <p class="text-sm text-red-400">{data.error}</p>
    {/if}

    {#if data.page.results.length > 0}
      <div
        class="flex items-center justify-between border-b border-theme-border pb-4"
      >
        <p
          class="text-xs font-header uppercase tracking-wider text-theme-text/60"
        >
          Found {data.page.results.length} world{data.page.results.length === 1
            ? ""
            : "s"}
        </p>
        <div
          class="flex items-center gap-1 rounded bg-theme-surface/60 p-1 border border-theme-border"
        >
          <button
            onclick={() => setViewMode("grid")}
            class="rounded px-2.5 py-1.5 transition text-theme-text/75 hover:text-theme-text hover:bg-theme-surface flex items-center justify-center {viewMode ===
            'grid'
              ? 'bg-theme-bg text-theme-primary shadow-sm border border-theme-border/50'
              : 'border border-transparent'}"
            title="Grid view"
            type="button"
          >
            <span class="icon-[lucide--grid] h-4 w-4"></span>
          </button>
          <button
            onclick={() => setViewMode("list")}
            class="rounded px-2.5 py-1.5 transition text-theme-text/75 hover:text-theme-text hover:bg-theme-surface flex items-center justify-center {viewMode ===
            'list'
              ? 'bg-theme-bg text-theme-primary shadow-sm border border-theme-border/50'
              : 'border border-transparent'}"
            title="List view"
            type="button"
          >
            <span class="icon-[lucide--list] h-4 w-4"></span>
          </button>
        </div>
      </div>
    {/if}

    {#if data.page.results.length === 0}
      <div
        class="rounded border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/70"
      >
        No public worlds match this search yet.
      </div>
    {:else if viewMode === "grid"}
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each data.page.results as result (result.publishId)}
          <a
            href={resolve(result.guestUrl as any)}
            class="flex h-full flex-col overflow-hidden rounded border border-theme-border bg-theme-surface/40 transition hover:border-theme-primary/50"
            data-testid="world-directory-card"
          >
            {#if result.coverImageUrl}
              <img
                src={result.coverImageUrl}
                alt={result.coverImageAlt || ""}
                class="aspect-[16/9] w-full object-cover"
              />
            {:else}
              <div
                class="flex aspect-[16/9] items-center justify-center bg-theme-bg/40 text-theme-text/40"
              >
                <span class="icon-[lucide--image] h-8 w-8"></span>
              </div>
            {/if}

            <div class="flex flex-1 flex-col gap-3 p-4">
              <div class="space-y-1">
                <h2 class="text-lg font-header font-bold text-theme-text">
                  {result.title}
                </h2>
                <p class="text-sm leading-relaxed text-theme-text/70">
                  {result.description}
                </p>
              </div>

              {#if result.labels.length}
                <div class="flex flex-wrap gap-2">
                  {#each result.labels as label (label)}
                    <span
                      class="rounded border border-theme-primary/30 bg-theme-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-theme-primary"
                      >{label}</span
                    >
                  {/each}
                </div>
              {/if}

              <div
                class="mt-auto flex items-center justify-between gap-3 text-xs text-theme-text/60"
              >
                <span>
                  {result.ownerDisplayName || "Guest-safe world"}
                </span>
                <span>{result.visibleEntityCount} entries</span>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each data.page.results as result (result.publishId)}
          <a
            href={resolve(result.guestUrl as any)}
            class="flex items-center justify-between gap-4 rounded border border-theme-border bg-theme-surface/40 p-4 transition hover:border-theme-primary/50"
            data-testid="world-directory-list-row"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 class="text-base font-header font-bold text-theme-text">
                  {result.title}
                </h2>
                {#if result.labels.length}
                  <div class="flex flex-wrap gap-1.5">
                    {#each result.labels as label (label)}
                      <span
                        class="rounded border border-theme-primary/20 bg-theme-primary/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-theme-primary"
                        >{label}</span
                      >
                    {/each}
                  </div>
                {/if}
              </div>
              <p class="truncate text-sm text-theme-text/70">
                {result.description || "No description provided."}
              </p>
            </div>

            <div
              class="flex flex-shrink-0 items-center gap-6 text-xs text-theme-text/60"
            >
              <span class="hidden sm:inline">
                {result.ownerDisplayName || "Guest-safe world"}
              </span>
              <span
                class="bg-theme-surface px-2.5 py-1 rounded border border-theme-border"
              >
                {result.visibleEntityCount} entries
              </span>
              <span
                class="icon-[lucide--chevron-right] h-4 w-4 text-theme-text/40"
              ></span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
