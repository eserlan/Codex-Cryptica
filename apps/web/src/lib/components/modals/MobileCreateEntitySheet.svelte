<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { entityTemplateService } from "$lib/services/EntityTemplateService.svelte";
  import { proposerStore } from "$lib/stores/proposer.svelte";

  let newTitle = $state("");
  let newType = $state<string>("character");
  let draftContent = $state("");
  let isCreating = $state(false);
  let createError = $state<string | null>(null);
  let useTemplate = $state(true);
  let inputEl = $state<HTMLInputElement | undefined>();
  let prefillStartDate = $state<{
    year: number;
    month: number;
    day: number;
  } | null>(null);

  // Consume draft from proposer (e.g. AI-suggested entity), including body content
  $effect(() => {
    const draft = proposerStore.draftEntity;
    if (draft && modalUIStore.showMobileCreateSheet) {
      newTitle = draft.title || "";
      newType = draft.type || "character";
      draftContent = draft.content || "";
      proposerStore.clearDraftEntity();
    }
  });

  // Ensure newType is valid when categories load
  $effect(() => {
    if (categories.list.length > 0) {
      const valid = categories.list.some((c) => c.id === newType);
      if (!valid) newType = categories.list[0].id;
    }
  });

  // Autofocus input when sheet opens; reset all fields on close
  $effect(() => {
    if (modalUIStore.showMobileCreateSheet) {
      prefillStartDate = modalUIStore.pendingCreateDate;
      setTimeout(() => inputEl?.focus(), 100);
    } else {
      newTitle = "";
      draftContent = "";
      createError = null;
      prefillStartDate = null;
      modalUIStore.pendingCreateDate = null;
    }
  });

  function close() {
    modalUIStore.showMobileCreateSheet = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || isCreating) return;
    isCreating = true;
    createError = null;
    try {
      let resolvedLore = "";
      let resolvedContent = "";
      if (useTemplate) {
        const folderHandle = await vault.getActiveFolderHandle();
        const vaultHandle = await vault.getActiveVaultHandle();
        const customTemplatesDirHandle = folderHandle ?? vaultHandle;
        resolvedLore = await entityTemplateService.resolveTemplate(
          newType,
          themeStore.worldThemeId,
          customTemplatesDirHandle,
        );
        resolvedContent = entityTemplateService.extractSummary(resolvedLore);
      }
      // Prepend AI draft content, matching VaultControls behaviour
      if (draftContent) {
        resolvedContent =
          draftContent + (resolvedContent ? "\n\n" + resolvedContent : "");
        resolvedLore =
          draftContent + (resolvedLore ? "\n\n" + resolvedLore : "");
      }
      const id = await vault.createEntity(newType, newTitle, {
        content: resolvedContent,
        lore: resolvedLore,
        ...(prefillStartDate ? { start_date: prefillStartDate } : {}),
      });
      vault.selectedEntityId = id;
      close();
    } catch (err: unknown) {
      createError = err instanceof Error ? err.message : String(err);
    } finally {
      isCreating = false;
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[90] bg-black/30"
  onclick={close}
  aria-hidden="true"
  transition:fade={{ duration: 500 }}
></div>

<!-- Sheet -->
<div
  class="fixed bottom-0 left-0 right-0 z-[91] bg-chrome-surface border-t border-chrome-border rounded-t-2xl shadow-2xl"
  role="dialog"
  aria-modal="true"
  aria-label="Create {themeStore.jargon.entity}"
  data-testid="mobile-create-entity-sheet"
  tabindex="-1"
  use:focusTrap
  transition:fly={{ y: 400, duration: 700, easing: quintOut }}
>
  <!-- Drag handle -->
  <div class="flex justify-center pt-3 pb-1">
    <div class="w-10 h-1 rounded-full bg-chrome-border"></div>
  </div>

  <div class="px-5 pb-2 pt-1 flex items-center justify-between">
    <h2 class="text-sm font-bold tracking-widest text-chrome-text uppercase">
      New {themeStore.jargon.entity}
    </h2>
    <button
      type="button"
      class="p-1.5 rounded-full text-chrome-muted hover:text-chrome-text hover:bg-chrome-bg transition-colors"
      onclick={close}
      aria-label="Cancel"
    >
      <span aria-hidden="true" class="icon-[heroicons--x-mark] w-5 h-5 block"
      ></span>
    </button>
  </div>

  {#if !vault.isInitialized}
    <!-- No vault open state -->
    <div class="px-5 pb-8 pt-2 flex flex-col gap-4 items-center text-center">
      <span class="icon-[lucide--database] w-8 h-8 text-chrome-muted"></span>
      <p class="text-sm text-chrome-muted">
        Open a {themeStore.jargon.vault} first to start creating entries.
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded border border-chrome-accent text-chrome-accent text-sm font-bold tracking-wider hover:bg-chrome-accent/10 transition-colors"
          onclick={() => {
            close();
            modalUIStore.openVaultSwitcher("create");
          }}
        >
          <span class="icon-[lucide--plus] w-4 h-4"></span>
          NEW {themeStore.jargon.vault.toUpperCase()}
        </button>
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded border border-chrome-border text-chrome-muted text-sm font-bold tracking-wider hover:border-chrome-accent hover:text-chrome-text transition-colors"
          onclick={() => {
            close();
            modalUIStore.openVaultSwitcher("open");
          }}
        >
          <span class="icon-[lucide--folder-open] w-4 h-4"></span>
          OPEN
        </button>
      </div>
    </div>
  {:else if vault.isGuest}
    <!-- Guest mode — read-only, cannot create -->
    <div class="px-5 pb-8 pt-2 flex flex-col gap-4 items-center text-center">
      <span class="icon-[lucide--lock] w-8 h-8 text-chrome-muted"></span>
      <p class="text-sm text-chrome-muted">
        Guests cannot create entries. Exit guest mode to manage your own vault.
      </p>
      <button
        type="button"
        class="px-4 py-2.5 rounded border border-chrome-border text-chrome-muted text-sm font-bold tracking-wider hover:border-chrome-accent hover:text-chrome-text transition-colors"
        onclick={close}
      >
        CLOSE
      </button>
    </div>
  {:else}
    <!-- Create form -->
    <form
      class="px-5 pb-8 pt-2 flex flex-col gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
    >
      <input
        bind:this={inputEl}
        bind:value={newTitle}
        placeholder="{themeStore.jargon.entity} title..."
        aria-label="New {themeStore.jargon.entity} title"
        data-testid="mobile-create-entity-title"
        class="w-full px-4 py-3 text-base bg-chrome-bg border border-chrome-border text-chrome-text rounded-lg focus:outline-none focus:border-chrome-accent placeholder-chrome-muted/50"
        aria-invalid={!!createError}
      />

      <select
        bind:value={newType}
        aria-label="Entity type"
        class="w-full px-4 py-3 text-sm bg-chrome-bg border border-chrome-border text-chrome-text rounded-lg focus:outline-none focus:border-chrome-accent"
      >
        {#each categories.list as cat}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>

      {#if prefillStartDate}
        <div
          class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs bg-chrome-accent/10 border border-chrome-accent/30 text-chrome-accent font-mono tracking-wide"
        >
          <span class="icon-[lucide--calendar] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          Start date: {prefillStartDate.year}-{String(
            prefillStartDate.month,
          ).padStart(2, "0")}-{String(prefillStartDate.day).padStart(2, "0")}
        </div>
      {/if}

      <label
        class="flex items-center gap-3 cursor-pointer select-none text-sm text-chrome-muted"
      >
        <input type="checkbox" bind:checked={useTemplate} class="sr-only" />
        <div
          class="w-9 h-5 rounded-full relative transition-colors border {useTemplate
            ? 'bg-chrome-accent/20 border-chrome-accent/60'
            : 'bg-chrome-bg border-chrome-border'}"
        >
          <div
            class="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all {useTemplate
              ? 'translate-x-4 bg-chrome-accent'
              : 'bg-chrome-muted'}"
          ></div>
        </div>
        Start from default format
      </label>

      {#if createError}
        <p class="text-xs text-red-400 text-center" role="alert">
          {createError}
        </p>
      {/if}

      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 py-3 rounded-lg border border-chrome-border text-chrome-muted font-bold tracking-widest text-sm hover:border-chrome-accent hover:text-chrome-text transition-colors"
          onclick={close}
        >
          CANCEL
        </button>
        <button
          type="submit"
          class="flex-[2] py-3 rounded-lg bg-chrome-accent text-chrome-bg font-bold tracking-widest text-sm transition-opacity {!newTitle.trim() ||
          isCreating
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-chrome-accent/90'}"
          aria-disabled={!newTitle.trim() || isCreating}
          aria-busy={isCreating}
          data-testid="mobile-create-entity-submit"
        >
          {#if isCreating}
            <span
              class="icon-[lucide--loader-2] w-4 h-4 animate-spin inline-block mr-2"
            ></span>
            ADDING...
          {:else}
            ADD {themeStore.jargon.entity.toUpperCase()}
          {/if}
        </button>
      </div>
    </form>

    <div class="px-5 pb-6 border-t border-chrome-border pt-4">
      <button
        type="button"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-chrome-border text-chrome-muted text-sm font-bold tracking-wider hover:border-chrome-accent hover:text-chrome-text transition-colors"
        onclick={() => {
          close();
          modalUIStore.openGeneratorWorkflow();
        }}
        data-testid="mobile-open-generator-button"
      >
        <span class="icon-[lucide--wand-2] w-4 h-4"></span>
        GENERATE
      </button>
    </div>
  {/if}
</div>
