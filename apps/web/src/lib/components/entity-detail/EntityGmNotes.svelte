<script lang="ts">
  import type { Entity } from "schema";
  import MarkdownEditor from "#lib/components/MarkdownEditor.svelte";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import type { EntityIndexEntry } from "#lib/utils/entity-mention-detector.js";
  import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";
  import { revisionService } from "#lib/services/RevisionService.svelte.js";
  import EntityProposals from "./EntityProposals.svelte";
  import { readGmNotesOpen, writeGmNotesOpen } from "./gm-notes-preference.js";

  let {
    entity,
    isEditing,
    editLore = $bindable(),
    onEntityClick,
    storage = browserStorage,
  }: {
    entity: Entity;
    isEditing: boolean;
    editLore: string;
    onEntityClick: (id: string) => void;
    storage?: StorageLike;
  } = $props();

  const bodyId = $props.id();

  // The stored choice is read once; later toggles update it locally.
  // svelte-ignore state_referenced_locally
  let remembered = $state(readGmNotesOpen(storage));
  const isOpen = $derived(isEditing || remembered);

  const toggle = () => {
    remembered = !remembered;
    writeGmNotesOpen(remembered, storage);
  };

  const draft = $derived(
    revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );

  const hasContent = $derived(
    isEditing || !!entity.lore?.trim() || draft !== null,
  );

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  const entityIndex = $derived.by<EntityIndexEntry[]>(() => {
    const index = vault.titleAndAliasIndex;
    const result: EntityIndexEntry[] = [];
    for (let i = 0; i < index.length; i++) {
      result.push({ text: index[i].lowercaseText, id: index[i].entityId });
    }
    return result;
  });
</script>

{#snippet header()}
  <h3
    class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-theme-text font-header"
  >
    <span aria-hidden="true" class="icon-[lucide--scroll-text] h-4 w-4"></span>
    <span>GM notes</span>
    <span class="text-helper font-normal text-theme-muted" aria-hidden="true"
      >{themeStore.jargon.lore_header}</span
    >
  </h3>
  <span
    class="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-theme-border px-1.5 py-0.5 text-helper font-bold uppercase tracking-wider text-theme-muted"
  >
    <span aria-hidden="true" class="icon-[lucide--eye-off] h-3 w-3"></span>
    GM only
  </span>
{/snippet}

{#snippet editor()}
  <div class="h-96">
    <MarkdownEditor
      content={editLore}
      editable={true}
      onUpdate={(val) => {
        if (isEditing) editLore = val;
      }}
    />
  </div>
{/snippet}

{#snippet reader()}
  <div
    class="prose-content {draft
      ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 p-3 -m-3 rounded-lg relative overflow-hidden'
      : ''}"
  >
    {#if draft}
      <div
        class="absolute top-0 right-0 p-2 text-nano font-bold text-theme-primary uppercase tracking-[0.2em]"
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
      {onEntityClick}
    />
  </div>
{/snippet}

{#snippet toggleHeader()}
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-2 text-left"
    aria-expanded={isOpen}
    aria-controls={bodyId}
    onclick={toggle}
  >
    <span
      aria-hidden="true"
      class="h-4 w-4 shrink-0 text-theme-muted {isOpen
        ? 'icon-[lucide--chevron-down]'
        : 'icon-[lucide--chevron-right]'}"
    ></span>
    {@render header()}
  </button>
{/snippet}

{#if !vault.isGuest && hasContent}
  <section data-testid="entity-gm-notes" class="space-y-3">
    <div class="border-b border-theme-border pb-1">
      {#if isEditing}
        <div class="flex items-center gap-2">{@render header()}</div>
      {:else}
        {@render toggleHeader()}
      {/if}
    </div>
    {#if isOpen}
      <div id={bodyId} class="space-y-4">
        {@render (isEditing && !draft ? editor : reader)()}
        <EntityProposals
          content={entity.lore || ""}
          {isEditing}
          entityId={entity.id}
        />
      </div>
    {/if}
  </section>
{/if}

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }
</style>
