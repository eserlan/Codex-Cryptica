<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { renderMarkdown } from "$lib/utils/markdown";
  import SilhouetteAvatar from "$lib/components/ui/SilhouetteAvatar.svelte";

  export interface SectionViewModel {
    title: string;
    type?: string;
    portraitUrl?: string;
    summary?: string;
    description?: string;
    notes?: string;
    secrets?: string;
    relationships: string[];
    affiliations: string[];
    members?: string[];
    /** Source entity, used to infer a silhouette when there is no portrait. */
    entity?: {
      type: string;
      title: string;
      labels: string[];
      silhouette?: string;
    };
    showVisual?: boolean;
  }

  let { view }: { view: SectionViewModel } = $props();

  let portraitSrc = $state<string | null>(null);
  let portraitFailed = $state(false);

  const md = (text: string | undefined) => (text ? renderMarkdown(text) : "");
  const showSilhouette = $derived(
    !portraitSrc &&
      (!view.portraitUrl || portraitFailed) &&
      !!view.entity &&
      view.showVisual !== false,
  );

  $effect(() => {
    const path = view.portraitUrl;
    portraitSrc = null;
    portraitFailed = false;
    if (!path) return;
    let cancelled = false;
    const resolution = Promise.resolve(vault.resolveImageUrl(path));
    resolution
      .then((url) => {
        if (cancelled) return;
        portraitSrc = url || null;
        portraitFailed = !url;
      })
      .catch(() => {
        if (cancelled) return;
        portraitSrc = null;
        portraitFailed = true;
      });
    return () => {
      cancelled = true;
      resolution.then(() => vault.releaseImageUrl(path)).catch(() => undefined);
    };
  });
</script>

<article class="border-t border-theme-border pt-4 space-y-2">
  <div class="flex items-start gap-3">
    {#if portraitSrc}
      <img
        src={portraitSrc}
        alt={view.title}
        class="w-14 h-14 rounded-lg object-cover border border-theme-border"
      />
    {:else if showSilhouette}
      <SilhouetteAvatar entity={view.entity} size="md" class="shrink-0" />
    {/if}
    <div>
      <h4 class="font-header text-base text-theme-text">{view.title}</h4>
      {#if view.type}
        <p class="text-xs uppercase tracking-wide text-theme-muted">
          {view.type}
        </p>
      {/if}
    </div>
  </div>
  {#if view.description ?? view.summary}
    <div class="report-md text-sm">
      {@html md(view.description ?? view.summary)}
    </div>
  {/if}
  {#if view.members?.length}
    <p class="text-sm">
      <span class="text-theme-muted">Members:</span>
      {view.members.join(", ")}
    </p>
  {/if}
  {#if view.affiliations.length}
    <p class="text-sm">
      <span class="text-theme-muted">Affiliations:</span>
      {view.affiliations.join(", ")}
    </p>
  {/if}
  {#if view.relationships.length}
    <ul class="text-sm list-disc pl-5">
      {#each view.relationships as line, i (i)}
        <li>{line}</li>
      {/each}
    </ul>
  {/if}
  {#if view.notes}
    <div class="report-md text-sm text-theme-muted">
      {@html md(view.notes)}
    </div>
  {/if}
  {#if view.secrets}
    <div
      class="rounded-lg border border-theme-primary/40 bg-theme-primary/5 p-3 text-sm"
      data-testid="report-preview-gm-only"
    >
      <span
        class="text-[10px] uppercase tracking-widest font-header text-theme-primary"
        >GM only</span
      >
      <div class="report-md">{@html md(view.secrets)}</div>
    </div>
  {/if}
</article>

<style>
  .report-md > :global(:last-child) {
    margin-bottom: 0;
  }
  .report-md :global(p) {
    margin-bottom: 0.5rem;
  }
  .report-md :global(h1),
  .report-md :global(h2),
  .report-md :global(h3),
  .report-md :global(h4) {
    font-family: var(--font-header, inherit);
    color: var(--theme-text);
    font-weight: 600;
    margin: 0.75rem 0 0.35rem;
  }
  .report-md :global(h1) {
    font-size: 1.15rem;
  }
  .report-md :global(h2) {
    font-size: 1.05rem;
  }
  .report-md :global(h3),
  .report-md :global(h4) {
    font-size: 0.95rem;
  }
  .report-md :global(strong) {
    font-weight: 700;
    color: var(--theme-text);
  }
  .report-md :global(em) {
    font-style: italic;
  }
  .report-md :global(ul),
  .report-md :global(ol) {
    margin: 0 0 0.5rem 1.25rem;
  }
  .report-md :global(ul) {
    list-style: disc;
  }
  .report-md :global(ol) {
    list-style: decimal;
  }
  .report-md :global(blockquote) {
    border-left: 2px solid var(--theme-border);
    padding-left: 0.75rem;
    margin: 0 0 0.5rem;
    font-style: italic;
  }
  .report-md :global(a) {
    color: var(--theme-primary);
    text-decoration: underline;
  }
  .report-md :global(code) {
    font-family: monospace;
    font-size: 0.85em;
  }
  .report-md :global(hr) {
    border-color: var(--theme-border);
    margin: 0.75rem 0;
  }
  .report-md :global(table) {
    border-collapse: collapse;
    margin-bottom: 0.5rem;
  }
  .report-md :global(th),
  .report-md :global(td) {
    border: 1px solid var(--theme-border);
    padding: 0.2rem 0.5rem;
  }
</style>
