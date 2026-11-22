<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  import AdventureImportReviewMetadata from "./AdventureImportReviewMetadata.svelte";

  let {
    draft,
    experimentalOrigin,
    canonicalHash,
    isApproved,
  }: {
    draft: AdventureJsonV1;
    experimentalOrigin: "markdown" | "pdf" | null;
    canonicalHash: string;
    isApproved: boolean;
  } = $props();

  const HOOK_TRUNCATE_CHARS = 240;
  let hookExpanded = $state(false);

  const authorText = $derived(
    draft.source.authors && draft.source.authors.length > 0
      ? draft.source.authors.join(", ")
      : null,
  );
  const systemName = $derived(draft.system?.name ?? null);
  const toneOrGenre = $derived.by(() => {
    const parts: string[] = [];
    if (draft.premise.tone) parts.push(draft.premise.tone);
    if (draft.premise.theme && draft.premise.theme.length > 0) {
      parts.push(draft.premise.theme.join(", "));
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  });

  const hookText = $derived(
    draft.premise.hook?.trim() ||
      draft.description?.trim() ||
      draft.premise.background?.trim() ||
      "",
  );
  const isHookLong = $derived(hookText.length > HOOK_TRUNCATE_CHARS);
  const displayedHook = $derived(
    isHookLong && !hookExpanded
      ? `${hookText.slice(0, HOOK_TRUNCATE_CHARS).trimEnd()}…`
      : hookText,
  );
</script>

{#snippet identityBadges()}
  {#if systemName || authorText || toneOrGenre}
    <div
      class="flex flex-wrap items-center gap-2 text-xs text-theme-text"
      data-testid="adventure-header-identity"
    >
      {#if systemName}
        <span
          class="inline-flex items-center gap-1 rounded-full border border-theme-border bg-theme-bg px-2.5 py-0.5 font-medium text-theme-text"
          data-testid="adventure-header-system"
        >
          {systemName}
        </span>
      {/if}
      {#if authorText}
        <span class="text-theme-text" data-testid="adventure-header-authors">
          By {authorText}
        </span>
      {/if}
      {#if toneOrGenre}
        <span
          class="rounded-full border border-theme-border bg-theme-bg px-2.5 py-0.5 text-theme-text"
          data-testid="adventure-header-tone-genre"
        >
          {toneOrGenre}
        </span>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet statusBadge()}
  <div class="flex items-center gap-2" aria-live="polite">
    <span
      data-testid="adventure-package-status"
      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold {isApproved
        ? 'border-theme-primary/50 bg-theme-primary/15 text-theme-text'
        : 'border-theme-border bg-theme-bg text-theme-text'}"
    >
      <span
        class={isApproved
          ? "icon-[lucide--lock] h-3.5 w-3.5"
          : "icon-[lucide--file-edit] h-3.5 w-3.5"}
        aria-hidden="true"
      ></span>
      {isApproved ? "Approved" : "Draft"}
    </span>
  </div>
{/snippet}

{#snippet hookBlock()}
  {#if hookText}
    <div class="space-y-1 text-sm text-theme-text">
      <p
        class="leading-relaxed text-theme-text"
        data-testid="adventure-header-hook"
      >
        {displayedHook}
      </p>
      {#if isHookLong}
        <button
          type="button"
          data-testid="adventure-header-hook-toggle"
          aria-expanded={hookExpanded}
          aria-label={hookExpanded
            ? "Show less of adventure hook"
            : "Read more of adventure hook"}
          onclick={() => (hookExpanded = !hookExpanded)}
          class="min-h-9 rounded-md border border-theme-text/75 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        >
          {hookExpanded ? "Show less" : "Read more"}
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

<header
  class="flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-5"
>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0 flex-1 space-y-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <p
          class="text-xs font-semibold uppercase tracking-widest text-theme-text"
        >
          Adventure JSON Review
        </p>
        {#if experimentalOrigin}
          <span
            class="rounded-full border border-theme-border px-2 py-0.5 text-xs font-medium text-theme-text"
            data-testid="adventure-experimental-origin"
          >
            Experimental {experimentalOrigin === "pdf" ? "PDF" : "Markdown"}
            import
          </span>
        {/if}
      </div>
      <h1
        id="adventure-import-review-heading"
        class="font-header text-2xl font-semibold text-theme-text"
      >
        {draft.title}
      </h1>
      {@render identityBadges()}
    </div>
    {@render statusBadge()}
  </div>
  {@render hookBlock()}
</header>

<AdventureImportReviewMetadata {draft} {canonicalHash} />
