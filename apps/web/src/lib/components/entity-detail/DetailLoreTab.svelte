<script lang="ts">
  import type { Entity } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";

  let {
    entity,
    isEditing,
    editLore = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editLore: string;
  }>();
</script>

<div class="space-y-4">
  <div>
    <div
      class="flex items-center gap-3 text-xs uppercase tracking-widest text-theme-muted mb-6 font-mono"
    >
      <span class="text-theme-accent icon-[lucide--file-text] w-4 h-4"></span>
      <span>{themeStore.jargon.lore_header}</span>
      <div class="h-px bg-theme-border flex-1 ml-2"></div>
    </div>
    {#if isEditing}
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
      <div class="prose-content">
        <MarkdownEditor
          content={entity.lore || "No detailed lore available."}
          editable={false}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }
</style>
