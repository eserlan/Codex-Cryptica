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
</script>

<header
  class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-theme-border bg-theme-surface p-5"
>
  <div class="min-w-0 space-y-1.5">
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
    <p class="text-xs text-theme-text">
      Package ID: <span class="font-mono">{draft.id}</span> · Version:
      <span class="font-mono">{draft.version}</span> · Format:
      <span class="font-mono">{draft.formatVersion}</span>
    </p>
    <p class="text-xs text-theme-text">
      Canonical SHA-256:
      <span class="break-all font-mono" data-testid="adventure-package-hash">
        {canonicalHash || "Computing…"}
      </span>
    </p>
  </div>

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
</header>

<AdventureImportReviewMetadata {draft} />
