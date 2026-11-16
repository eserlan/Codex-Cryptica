<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  let { draft }: { draft: AdventureJsonV1 } = $props();
</script>

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-metadata-heading"
  data-testid="review-metadata"
>
  <h2
    id="review-metadata-heading"
    class="font-header text-lg font-semibold text-theme-text"
  >
    Premise and Source
  </h2>
  {#if draft.description}
    <p class="text-sm text-theme-text">{draft.description}</p>
  {/if}
  <div class="grid gap-3 sm:grid-cols-2">
    <div
      class="space-y-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        Background
      </p>
      <p class="text-theme-text">{draft.premise.background || "—"}</p>
    </div>
    <div
      class="space-y-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        Hook
      </p>
      <p class="text-theme-text">{draft.premise.hook || "—"}</p>
    </div>
  </div>
  <dl class="grid gap-2 text-xs text-theme-text sm:grid-cols-2">
    <div>
      <dt class="font-semibold">Source title</dt>
      <dd>{draft.source.title}</dd>
    </div>
    {#if draft.source.authors && draft.source.authors.length > 0}
      <div>
        <dt class="font-semibold">Authors</dt>
        <dd>{draft.source.authors.join(", ")}</dd>
      </div>
    {/if}
    {#if draft.source.publisher}
      <div>
        <dt class="font-semibold">Publisher</dt>
        <dd>{draft.source.publisher}</dd>
      </div>
    {/if}
    {#if draft.source.publishedDate}
      <div>
        <dt class="font-semibold">Published</dt>
        <dd>{draft.source.publishedDate}</dd>
      </div>
    {/if}
    {#if draft.source.license}
      <div>
        <dt class="font-semibold">Licence</dt>
        <dd>{draft.source.license}</dd>
      </div>
    {/if}
    {#if draft.source.url}
      <div>
        <dt class="font-semibold">URL</dt>
        <dd class="break-all font-mono">{draft.source.url}</dd>
      </div>
    {/if}
    {#if draft.source.documentHash}
      <div class="sm:col-span-2">
        <dt class="font-semibold">Source document hash</dt>
        <dd class="break-all font-mono">{draft.source.documentHash}</dd>
      </div>
    {/if}
    {#if draft.system}
      <div>
        <dt class="font-semibold">System</dt>
        <dd>{draft.system.name}</dd>
      </div>
    {/if}
    {#if draft.premise.theme && draft.premise.theme.length > 0}
      <div>
        <dt class="font-semibold">Themes</dt>
        <dd>{draft.premise.theme.join(", ")}</dd>
      </div>
    {/if}
    {#if draft.premise.tone}
      <div>
        <dt class="font-semibold">Tone</dt>
        <dd>{draft.premise.tone}</dd>
      </div>
    {/if}
  </dl>
</section>
