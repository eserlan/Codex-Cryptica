<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import TemplateDirectory from "$lib/components/stats/community-template/TemplateDirectory.svelte";
  import EntityTemplateBrowse from "./EntityTemplateBrowse.svelte";

  type Kind = "stat-sheet" | "entity";
  let kind = $state<Kind>(
    page.url.searchParams.get("kind") === "entity" ? "entity" : "stat-sheet",
  );

  const TABS: { kind: Kind; label: string }[] = [
    { kind: "entity", label: "Entity templates" },
    { kind: "stat-sheet", label: "Stat sheet templates" },
  ];

  function switchKind(next: Kind) {
    if (next === kind) return;
    kind = next;
    void goto(next === "entity" ? "?kind=entity" : "?", {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }
</script>

<div class="mx-auto w-full max-w-6xl px-6 pt-6">
  <div
    class="inline-flex rounded-lg border border-theme-border p-1 text-sm"
    role="tablist"
    aria-label="Template kind"
  >
    {#each TABS as tab (tab.kind)}
      <button
        type="button"
        role="tab"
        aria-selected={kind === tab.kind}
        class="rounded-md px-3 py-1.5 {kind === tab.kind
          ? 'bg-theme-primary font-bold text-theme-bg'
          : 'text-theme-text hover:text-theme-primary'}"
        onclick={() => switchKind(tab.kind)}>{tab.label}</button
      >
    {/each}
  </div>
</div>

{#if kind === "entity"}
  <section
    class="mx-auto w-full max-w-6xl space-y-6 p-6"
    data-testid="template-directory"
  >
    <EntityTemplateBrowse />
  </section>
{:else}
  <TemplateDirectory />
{/if}
