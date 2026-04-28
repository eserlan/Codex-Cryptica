<script lang="ts">
  import type { Entity } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
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
</script>

{#if !vault.isGuest}
  <div class="space-y-4">
    <div>
      <div
        class="flex items-center gap-3 text-xs uppercase tracking-widest text-theme-muted mb-6 font-header"
      >
        <span class="text-theme-accent icon-[lucide--file-text] w-4 h-4"></span>
        <span>{themeStore.jargon.lore_header}</span>
        <div class="h-px bg-theme-border flex-1 ml-2"></div>
      </div>
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
