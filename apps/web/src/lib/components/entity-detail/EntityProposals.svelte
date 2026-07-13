<script lang="ts">
  import { extractProposals } from "editor-core";
  import { vault } from "$lib/stores/vault.svelte";
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { searchService } from "@codex/search-orchestrator";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { ProposerService } from "@codex/proposer";
  import {
    loadIgnoredEntityProposals,
    saveIgnoredEntityProposals,
  } from "$lib/utils/entity-proposal-ignores";

  let {
    content,
    isEditing = false,
    entityId,
  } = $props<{
    content: string;
    isEditing?: boolean;
    entityId?: string;
  }>();

  const existingTitles = $derived.by(() => {
    const names = new Set<string>();
    for (const entity of vault.allEntities) {
      names.add(entity.title);
      for (const alias of entity.aliases ?? []) names.add(alias);
    }
    return names;
  });
  let ignoredTitles = $state<Set<string>>(
    loadIgnoredEntityProposals(vault.activeVaultId),
  );
  const proposals = $derived(
    extractProposals(content, existingTitles)
      .filter((title) => !title.toLowerCase().endsWith("'s"))
      .filter((title) => !ignoredTitles.has(title.toLowerCase())),
  );
  let draftingTitle = $state<string | null>(null);

  function ignore(title: string) {
    ignoredTitles = new Set(ignoredTitles).add(title.toLowerCase());
    saveIgnoredEntityProposals(vault.activeVaultId, ignoredTitles);
  }

  async function openCreateForm(title: string) {
    if (draftingTitle) return;
    draftingTitle = title;
    try {
      const matches = await searchService.search(title, { limit: 5 });
      const relatedContext = matches
        .map((match) => vault.entities[match.id])
        .filter(Boolean)
        .map((entity) =>
          entity
            ? `## ${entity.title}\n${entity.content || entity.lore || ""}`
            : "",
        )
        .join("\n\n");
      const createdEntityId = await vault.createEntity("note", title, {
        content: "",
      });
      const sourceId = entityId ?? vault.selectedEntityId;
      vault.selectedEntityId = createdEntityId;
      const drafted = await revisionService.revise({
        entityId: createdEntityId,
        instructions: `Create a draft for "${title}" from this originating entity:\n\n${content}\n\nRelated vault context:\n${relatedContext || "None found."}`,
      });
      if (!drafted || !revisionService.pendingDraft) {
        await vault.deleteEntity(createdEntityId);
        return;
      }
      if (sourceId) {
        const source = vault.entities[sourceId];
        let type = "related_to";
        let label = "Related";
        if (source && oracle.apiKey) {
          const proposal =
            await new ProposerService().generateConnectionProposal(
              oracle.apiKey,
              "gemini-2.5-flash",
              `${source.content || ""}\n${source.lore || ""}`,
              revisionService.pendingDraft.chronicle,
              source.title,
              title,
            );
          type = proposal.type;
          label = proposal.label;
        }
        await vault.addConnection(sourceId, createdEntityId, type, label);
      }
      revisionService.pendingDraft.deleteOnDiscard = true;
    } catch {
      proposerStore.draftEntity = { title, content: "", type: "note" };
      modalUIStore.requestCreateEntity();
      return;
    } finally {
      draftingTitle = null;
    }
  }
</script>

{#if !vault.isGuest && !isEditing && proposals.length > 0}
  <section class="mt-8 border-t border-theme-border pt-6">
    <div class="mb-4 flex items-center justify-between">
      <h3
        class="flex items-center gap-2 font-body text-lg italic text-theme-secondary"
      >
        <span
          class="icon-[lucide--file-plus-2] h-4 w-4 text-theme-primary"
          aria-hidden="true"
        ></span>
        Proposed Entities
      </h3>
      <span
        class="rounded-full border border-theme-border bg-theme-bg/50 px-2 py-1 text-xs text-theme-muted"
      >
        {proposals.length} New
      </span>
    </div>

    <div class="space-y-3">
      {#each proposals as title (title)}
        <div
          class="flex items-center justify-between gap-3 rounded-lg border border-theme-border/50 bg-theme-bg/30 p-3"
        >
          <span class="text-sm font-bold text-theme-text">{title}</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded p-1.5 text-theme-muted transition-colors hover:bg-theme-bg hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
              onclick={() => ignore(title)}
              aria-label="Ignore proposed entity {title}"
              title="Ignore this proposal"
            >
              <span
                class="icon-[lucide--eye-off] h-3.5 w-3.5"
                aria-hidden="true"
              ></span>
            </button>
            <button
              type="button"
              class="rounded bg-theme-primary/10 px-3 py-1 text-xs text-theme-primary transition-colors hover:bg-theme-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
              onclick={() => void openCreateForm(title)}
              disabled={draftingTitle !== null}
              aria-label="Create proposed entity {title}"
            >
              {draftingTitle === title ? "Drafting…" : "Create"}
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}
