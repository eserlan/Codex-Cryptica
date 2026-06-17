<script lang="ts">
  import type { Entity } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import { revisionService } from "$lib/services/RevisionService.svelte";

  let {
    entity,
    isEditing,
    editLore = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editLore: string;
  }>();

  const draft = $derived(
    revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  // ⚡ Bolt Optimization: Use the pre-cached titleAndAliasIndex with an imperative loop
  // to avoid intermediate array allocations from Object.values().flatMap()
  const entityIndex = $derived.by<EntityIndexEntry[]>(() => {
    const index = vault.titleAndAliasIndex;
    const result: EntityIndexEntry[] = [];
    for (let i = 0; i < index.length; i++) {
      result.push({ text: index[i].lowercaseText, id: index[i].entityId });
    }
    return result;
  });
</script>

{#if !vault.isGuest}
  <div class="space-y-4">
    <div>
      {#if isEditing && !draft}
        <div class="h-96">
          <MarkdownEditor
            content={editLore}
            editable={true}
            onUpdate={(val) => {
              if (isEditing) editLore = val;
            }}
          />
        </div>
      {:else}
        <div
          class="prose-content {draft
            ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 p-3 -m-3 rounded-lg relative overflow-hidden'
            : ''}"
        >
          {#if draft}
            <div
              class="absolute top-0 right-0 p-2 text-[8px] font-bold text-theme-primary uppercase tracking-[0.2em]"
            >
              Proposed
            </div>
          {/if}
          <MarkdownEditor
            content={draft
              ? draft.lore
              : entity.lore || "No detailed lore available."}
            editable={false}
            {entityIndex}
            currentEntityId={entity.id}
            onEntityClick={(id) => {
              vault.selectedEntityId = id;
            }}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }
</style>
