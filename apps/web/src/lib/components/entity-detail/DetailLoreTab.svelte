<script lang="ts">
  import type { Entity } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import { regenerationService } from "$lib/services/RegenerationService.svelte";

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
    regenerationService.pendingDraft?.entityId === entity.id
      ? regenerationService.pendingDraft
      : null,
  );

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  const entityIndex = $derived<EntityIndexEntry[]>(
    Object.values(vault.entities).flatMap((e) => [
      { text: e.title.toLowerCase(), id: e.id },
      ...e.aliases.map((a) => ({ text: a.toLowerCase(), id: e.id })),
    ]),
  );
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
