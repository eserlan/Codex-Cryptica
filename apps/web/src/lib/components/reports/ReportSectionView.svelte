<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";

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
  }

  let { view }: { view: SectionViewModel } = $props();

  let portraitSrc = $state<string | null>(null);

  $effect(() => {
    const path = view.portraitUrl;
    portraitSrc = null;
    if (!path) return;
    let cancelled = false;
    Promise.resolve(vault.resolveImageUrl(path))
      .then((url) => {
        if (!cancelled) portraitSrc = url || null;
      })
      .catch(() => {
        if (!cancelled) portraitSrc = null;
      });
    return () => {
      cancelled = true;
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
    <p class="text-sm whitespace-pre-line">
      {view.description ?? view.summary}
    </p>
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
      {#each view.relationships as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
  {/if}
  {#if view.notes}
    <p class="text-sm whitespace-pre-line text-theme-muted">{view.notes}</p>
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
      <p class="whitespace-pre-line">{view.secrets}</p>
    </div>
  {/if}
</article>
