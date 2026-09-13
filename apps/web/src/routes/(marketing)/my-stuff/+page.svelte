<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { myStuffService } from "$lib/services/my-stuff/my-stuff-service";
  import {
    trackMyStuffOpened,
    trackMyStuffItemOpened,
    trackMyStuffShareLinkCopied,
    trackMyStuffShareRevoked,
    trackMyStuffLikedRemoved,
    type MyStuffTab,
  } from "$lib/services/my-stuff/my-stuff-tracking";
  import { copyTextToClipboard } from "$lib/utils/share-link";
  import type {
    LikedAnswerItem,
    SharedGeneratorItem,
  } from "$lib/services/my-stuff/types";

  const cleanBase = $derived(base === "/" ? "" : base);

  let activeTab = $state<MyStuffTab>("liked");
  let likedAnswers = $state<LikedAnswerItem[]>([]);
  let sharedGenerators = $state<SharedGeneratorItem[]>([]);
  let isLoaded = $state(false);
  let copiedShareId = $state<string | null>(null);
  let revokingShareId = $state<string | null>(null);
  let revokeErrorShareId = $state<string | null>(null);

  function refreshData() {
    if (!browser) return;
    likedAnswers = myStuffService.getLikedAnswers();
    sharedGenerators = myStuffService.getSharedGenerators();
    isLoaded = true;
  }

  onMount(() => {
    refreshData();
    trackMyStuffOpened(activeTab);
  });

  function setTab(tab: MyStuffTab) {
    if (activeTab === tab) return;
    activeTab = tab;
    trackMyStuffOpened(tab);
  }

  function handleRemoveLiked(slug: string) {
    myStuffService.removeLikedAnswer(slug);
    trackMyStuffLikedRemoved(slug);
    refreshData();
  }

  async function handleCopyShareLink(item: SharedGeneratorItem) {
    const success = await copyTextToClipboard(item.url);
    if (success) {
      copiedShareId = item.shareId;
      trackMyStuffShareLinkCopied(item.shareId);
      setTimeout(() => {
        if (copiedShareId === item.shareId) {
          copiedShareId = null;
        }
      }, 2000);
    }
  }

  async function handleRevokeShare(item: SharedGeneratorItem) {
    if (revokingShareId === item.shareId) return;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        `Are you sure you want to revoke the public share link for "${item.title}"? Anyone with the link will no longer be able to view it.`,
      );
    if (!confirmed) return;

    revokingShareId = item.shareId;
    revokeErrorShareId = null;
    try {
      const revoked = await myStuffService.revokeSharedGenerator(item.shareId);
      if (!revoked) {
        revokeErrorShareId = item.shareId;
        return;
      }
      trackMyStuffShareRevoked(item.shareId);
      refreshData();
    } catch {
      revokeErrorShareId = item.shareId;
    } finally {
      revokingShareId = null;
    }
  }

  function formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  }
</script>

<SeoHead
  title="My Stuff | Codex Cryptica"
  description="Your local saved answers and shared generator results in Codex Cryptica."
  robots="noindex, follow"
/>

<div class="min-h-screen bg-theme-bg py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Header -->
    <header class="space-y-3">
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-theme-surface border border-theme-border text-theme-muted"
      >
        <span
          class="icon-[lucide--bookmark] h-3.5 w-3.5 text-theme-primary"
          aria-hidden="true"
        ></span>
        <span>Personal Library</span>
      </div>
      <h1
        class="font-header text-3xl sm:text-4xl font-extrabold text-theme-text tracking-tight"
      >
        My Stuff
      </h1>
      <p class="text-base text-theme-muted max-w-2xl">
        A lightweight personal space for answers you have marked as useful and
        generator results you have shared publicly.
      </p>
    </header>

    <!-- Device-local Privacy Banner -->
    <aside
      aria-label="Device storage notice"
      class="flex items-start gap-3.5 p-4 rounded-xl border border-theme-border/80 bg-theme-surface/50 text-sm text-theme-muted"
    >
      <span
        class="icon-[lucide--hard-drive] h-5 w-5 text-theme-primary shrink-0 mt-0.5"
        aria-hidden="true"
      ></span>
      <div class="space-y-1">
        <p class="font-medium text-theme-text">Stored on this browser only</p>
        <p class="text-xs text-theme-muted leading-relaxed">
          Codex Cryptica does not require an account or store your bookmarks on
          a cloud server. These entries are remembered in this browser's local
          storage and will remain available until you clear browser site data.
        </p>
      </div>
    </aside>

    <!-- Tabs Navigation -->
    <div
      class="border-b border-theme-border flex items-center gap-4"
      role="tablist"
      aria-label="My Stuff Sections"
    >
      <button
        type="button"
        role="tab"
        id="tab-liked"
        aria-controls="panel-liked"
        aria-selected={activeTab === "liked"}
        tabindex={activeTab === "liked" ? 0 : -1}
        class="pb-3 text-sm font-header font-bold transition-colors relative flex items-center gap-2 {activeTab ===
        'liked'
          ? 'text-theme-primary'
          : 'text-theme-muted hover:text-theme-text'}"
        onclick={() => setTab("liked")}
      >
        <span class="icon-[lucide--thumbs-up] h-4 w-4" aria-hidden="true"
        ></span>
        <span>Liked & Useful</span>
        {#if isLoaded}
          <span
            class="px-2 py-0.5 text-xs rounded-full bg-theme-surface border border-theme-border text-theme-muted"
          >
            {likedAnswers.length}
          </span>
        {/if}
        {#if activeTab === "liked"}
          <span
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary rounded-full"
          ></span>
        {/if}
      </button>

      <button
        type="button"
        role="tab"
        id="tab-shared"
        aria-controls="panel-shared"
        aria-selected={activeTab === "shared"}
        tabindex={activeTab === "shared" ? 0 : -1}
        class="pb-3 text-sm font-header font-bold transition-colors relative flex items-center gap-2 {activeTab ===
        'shared'
          ? 'text-theme-primary'
          : 'text-theme-muted hover:text-theme-text'}"
        onclick={() => setTab("shared")}
      >
        <span class="icon-[lucide--share-2] h-4 w-4" aria-hidden="true"></span>
        <span>Shared Results</span>
        {#if isLoaded}
          <span
            class="px-2 py-0.5 text-xs rounded-full bg-theme-surface border border-theme-border text-theme-muted"
          >
            {sharedGenerators.length}
          </span>
        {/if}
        {#if activeTab === "shared"}
          <span
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary rounded-full"
          ></span>
        {/if}
      </button>
    </div>

    <!-- Tab Panels -->
    {#if activeTab === "liked"}
      <div
        role="tabpanel"
        id="panel-liked"
        aria-labelledby="tab-liked"
        class="space-y-4 focus-visible:outline-none"
      >
        {#if !isLoaded}
          <div class="py-12 text-center text-sm text-theme-muted">
            Loading saved content...
          </div>
        {:else if likedAnswers.length === 0}
          <div
            class="text-center py-16 px-4 rounded-2xl border border-dashed border-theme-border bg-theme-surface/30 space-y-4"
          >
            <div
              class="mx-auto w-12 h-12 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-muted"
            >
              <span class="icon-[lucide--thumbs-up] h-6 w-6" aria-hidden="true"
              ></span>
            </div>
            <div class="space-y-1">
              <h3 class="font-header font-bold text-lg text-theme-text">
                No liked answers yet
              </h3>
              <p class="text-sm text-theme-muted max-w-md mx-auto">
                When you read our reference guides and tap “Yes” under “Was this
                useful?”, they are saved here for convenient return visits.
              </p>
            </div>
            <div>
              <a
                href="{cleanBase}/explore"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-theme-bg font-header font-bold text-xs hover:brightness-110 transition-all"
              >
                <span>Browse Answers & Guides</span>
                <span
                  class="icon-[lucide--arrow-right] h-4 w-4"
                  aria-hidden="true"
                ></span>
              </a>
            </div>
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-1">
            {#each likedAnswers as answer (answer.slug)}
              <article
                class="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-primary/40 transition-all space-y-3"
              >
                <div class="flex items-center justify-between gap-2">
                  {#if answer.categoryLabel}
                    <span
                      class="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-theme-bg border border-theme-border text-theme-primary"
                    >
                      {answer.categoryLabel}
                    </span>
                  {/if}
                  <button
                    type="button"
                    class="text-xs text-theme-muted hover:text-red-400 p-1 rounded transition-colors inline-flex items-center gap-1"
                    title="Remove from saved"
                    aria-label="Remove from saved"
                    onclick={() => handleRemoveLiked(answer.slug)}
                  >
                    <span
                      class="icon-[lucide--bookmark-x] h-3.5 w-3.5"
                      aria-hidden="true"
                    ></span>
                    <span class="hidden sm:inline">Remove</span>
                  </button>
                </div>

                <div class="space-y-1">
                  <h2 class="font-header text-lg font-bold text-theme-text">
                    <a
                      href="{cleanBase}{answer.href}"
                      class="hover:text-theme-primary transition-colors"
                      onclick={() =>
                        trackMyStuffItemOpened("answer", answer.slug)}
                    >
                      {answer.question}
                    </a>
                  </h2>
                  <p class="text-xs sm:text-sm text-theme-muted line-clamp-2">
                    {answer.summary}
                  </p>
                </div>

                <div class="pt-2 flex items-center justify-between">
                  <a
                    href="{cleanBase}{answer.href}"
                    class="text-xs font-header font-bold text-theme-primary hover:underline inline-flex items-center gap-1"
                    onclick={() =>
                      trackMyStuffItemOpened("answer", answer.slug)}
                  >
                    <span>Read answer</span>
                    <span
                      class="icon-[lucide--arrow-up-right] h-3.5 w-3.5"
                      aria-hidden="true"
                    ></span>
                  </a>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === "shared"}
      <div
        role="tabpanel"
        id="panel-shared"
        aria-labelledby="tab-shared"
        class="space-y-4 focus-visible:outline-none"
      >
        {#if !isLoaded}
          <div class="py-12 text-center text-sm text-theme-muted">
            Loading shared creations...
          </div>
        {:else if sharedGenerators.length === 0}
          <div
            class="text-center py-16 px-4 rounded-2xl border border-dashed border-theme-border bg-theme-surface/30 space-y-4"
          >
            <div
              class="mx-auto w-12 h-12 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-muted"
            >
              <span class="icon-[lucide--share-2] h-6 w-6" aria-hidden="true"
              ></span>
            </div>
            <div class="space-y-1">
              <h3 class="font-header font-bold text-lg text-theme-text">
                No shared results yet
              </h3>
              <p class="text-sm text-theme-muted max-w-md mx-auto">
                When you create a shareable link from any generator, the public
                snapshot is remembered here so you can copy or revoke it later.
              </p>
            </div>
            <div>
              <a
                href="{cleanBase}/generators"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-theme-bg font-header font-bold text-xs hover:brightness-110 transition-all"
              >
                <span>Explore Generators</span>
                <span
                  class="icon-[lucide--arrow-right] h-4 w-4"
                  aria-hidden="true"
                ></span>
              </a>
            </div>
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-1">
            {#each sharedGenerators as item (item.shareId)}
              <article
                class="p-5 rounded-xl border border-theme-border bg-theme-surface hover:border-theme-primary/40 transition-all space-y-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-theme-bg border border-theme-border text-theme-primary"
                  >
                    {item.generatorTitle || item.generatorId}
                  </span>
                  <span class="text-xs text-theme-muted">
                    {formatDate(item.createdAt)}
                  </span>
                </div>

                <div class="space-y-1">
                  <h2 class="font-header text-lg font-bold text-theme-text">
                    <a
                      href="{cleanBase}/share/{item.shareId}"
                      class="hover:text-theme-primary transition-colors"
                      onclick={() =>
                        trackMyStuffItemOpened("generator_share", item.shareId)}
                    >
                      {item.title}
                    </a>
                  </h2>
                  {#if item.excerpt}
                    <p class="text-xs sm:text-sm text-theme-muted line-clamp-2">
                      {item.excerpt}
                    </p>
                  {/if}
                </div>

                <div
                  class="pt-3 border-t border-theme-border/50 flex flex-wrap items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-2">
                    <a
                      href="{cleanBase}/share/{item.shareId}"
                      class="text-xs font-header font-bold text-theme-primary hover:underline inline-flex items-center gap-1"
                      onclick={() =>
                        trackMyStuffItemOpened("generator_share", item.shareId)}
                    >
                      <span>Open Snapshot</span>
                      <span
                        class="icon-[lucide--external-link] h-3.5 w-3.5"
                        aria-hidden="true"
                      ></span>
                    </a>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 text-xs font-header font-medium rounded-lg border border-theme-border bg-theme-bg hover:bg-theme-surface transition-colors inline-flex items-center gap-1.5 text-theme-text"
                      onclick={() => handleCopyShareLink(item)}
                    >
                      {#if copiedShareId === item.shareId}
                        <span
                          class="icon-[lucide--check] h-3.5 w-3.5 text-green-400"
                          aria-hidden="true"
                        ></span>
                        <span class="text-green-400">Copied</span>
                      {:else}
                        <span
                          class="icon-[lucide--copy] h-3.5 w-3.5 text-theme-muted"
                          aria-hidden="true"
                        ></span>
                        <span>Copy Link</span>
                      {/if}
                    </button>

                    <button
                      type="button"
                      disabled={revokingShareId === item.shareId}
                      class="px-3 py-1.5 text-xs font-header font-medium rounded-lg border border-theme-border/60 hover:border-red-500/40 text-theme-muted hover:text-red-400 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      onclick={() => handleRevokeShare(item)}
                    >
                      <span
                        class="icon-[lucide--trash-2] h-3.5 w-3.5"
                        aria-hidden="true"
                      ></span>
                      <span
                        >{revokingShareId === item.shareId
                          ? "Revoking..."
                          : "Revoke"}</span
                      >
                    </button>
                  </div>
                </div>
                {#if revokeErrorShareId === item.shareId}
                  <p class="text-xs text-theme-danger" role="alert">
                    Could not revoke this share. It is still available publicly.
                  </p>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
