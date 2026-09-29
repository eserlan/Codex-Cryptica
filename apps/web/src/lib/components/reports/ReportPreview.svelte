<script lang="ts">
  import ReportSectionView from "./ReportSectionView.svelte";
  import {
    renderCharacterSummary,
    renderFactionSummary,
    renderGenericSummary,
    type ReportDocument,
    type ReportSection,
  } from "entity-report-engine";

  let { document }: { document: ReportDocument } = $props();

  function viewFor(section: ReportSection) {
    switch (section.kind) {
      case "character":
        return renderCharacterSummary(
          section.entity,
          section.relationships,
          section.affiliations,
          document.detail,
        );
      case "faction":
        return {
          ...renderFactionSummary(
            section.entity,
            section.members,
            section.relationships,
            document.detail,
          ),
          type: "faction",
          affiliations: [] as string[],
        };
      default:
        return renderGenericSummary(section.entity, document.detail);
    }
  }

  const views = $derived(
    document.sections.map((section) => ({
      section,
      view: viewFor(section) as ReturnType<typeof renderCharacterSummary> & {
        members?: string[];
      },
    })),
  );
</script>

<div class="space-y-6 text-theme-text" data-testid="report-preview">
  {#if document.overview.entityCount === 0}
    <p class="text-sm text-theme-muted" data-testid="report-preview-empty">
      There is nothing to report yet. Add entities to the canvas or select some
      first.
    </p>
  {:else}
    <section>
      <h3
        class="text-xs font-header uppercase tracking-widest text-theme-primary mb-1"
      >
        Overview
      </h3>
      <p class="text-sm text-theme-muted">
        {document.overview.entityCount}
        {document.overview.entityCount === 1 ? "entity" : "entities"} ·
        {document.overview.relationshipCount}
        {document.overview.relationshipCount === 1
          ? "relationship"
          : "relationships"} ·
        {document.overview.factionCount}
        {document.overview.factionCount === 1 ? "faction" : "factions"}
      </p>
    </section>

    {#each views as { section, view } (section.entity.id)}
      <ReportSectionView {view} />
    {/each}

    {#if document.relationshipSummary.length}
      <section class="border-t border-theme-border pt-4">
        <h3
          class="text-xs font-header uppercase tracking-widest text-theme-primary mb-2"
        >
          Relationship summary
        </h3>
        <ul class="text-sm list-disc pl-5">
          {#each document.relationshipSummary as line, i (i)}
            <li>{line.sourceTitle} — {line.label} → {line.targetTitle}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>
