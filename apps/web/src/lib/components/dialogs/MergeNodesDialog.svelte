<script lang="ts">
  import {
    nodeMergeService,
    type IMergedContentProposal,
  } from "$lib/services/node-merge.service";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let {
    isOpen = false,
    sourceNodeIds = [],
    onClose = () => {},
    onSuccess = () => {},
  } = $props<{
    isOpen: boolean;
    sourceNodeIds: string[];
    onClose?: () => void;
    onSuccess?: () => void;
  }>();

  let targetId = $state("");
  let previewContent = $state("");
  let proposal = $state<IMergedContentProposal | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let strategy = $state<"concat" | "ai">("concat");

  const loadProposal = async () => {
    if (!targetId || !isOpen) return;

    isLoading = true;
    error = null;
    try {
      proposal = await nodeMergeService.proposeMerge({
        sourceNodeIds,
        targetNodeId: targetId,
        strategy,
      });
      previewContent = proposal.suggestedBody;
    } catch (e: any) {
      console.error(e);
      error = e.message;
    } finally {
      isLoading = false;
    }
  };

  let previousActiveElement: HTMLElement | null = null;
  let modalElement: HTMLElement | undefined = $state();

  $effect(() => {
    if (isOpen) {
      previousActiveElement = document.activeElement as HTMLElement;
      if (
        sourceNodeIds.length > 0 &&
        (!targetId || !sourceNodeIds.includes(targetId))
      ) {
        targetId = sourceNodeIds[0];
      }
      setTimeout(() => {
        const firstFocusable = modalElement?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 10);
    } else if (previousActiveElement) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") {
      onClose();
      e.stopPropagation();
    } else if (e.key === "Tab") {
      if (!modalElement) return;
      const focusables = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  const handleMerge = async () => {
    if (!proposal || !targetId) return;

    // Check for unsaved changes (T011)
    if (nodeMergeService.checkUnsavedChanges(sourceNodeIds)) {
      if (
        !(await uiStore.confirm({
          title: "Unsaved Changes",
          message:
            "Some nodes might be open in the editor with unsaved changes. Proceeding might lose recent edits. Continue?",
          isDangerous: false,
        }))
      ) {
        return;
      }
    }

    isLoading = true;
    try {
      const finalProposal: IMergedContentProposal = {
        ...proposal,
        targetId,
        suggestedBody: previewContent,
        // Frontmatter assumed merged in proposal
      };

      await nodeMergeService.executeMerge(finalProposal, sourceNodeIds);
      onSuccess();
      onClose();
    } catch (e: any) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  };
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
  >
    <div
      bind:this={modalElement}
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-nodes-title"
      tabindex="-1"
      onkeydown={handleKeydown}
      class="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-lg shadow-2xl flex flex-col max-h-[90vh] focus:outline-none"
    >
      <div
        class="p-6 border-b border-theme-border flex justify-between items-center"
      >
        <h2 id="merge-nodes-title" class="text-xl font-bold text-theme-text">
          Merge {sourceNodeIds.length}
          {themeStore.resolveJargon("entity", sourceNodeIds.length)}
        </h2>
        <button
          onclick={() => onClose()}
          class="text-theme-muted hover:text-theme-text"
          aria-label="Close"
        >
          <span class="icon-[lucide--x] w-6 h-6"></span>
        </button>
      </div>

      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        {#if error}
          <div
            class="p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded"
          >
            {error}
          </div>
        {/if}

        <div>
          <label
            class="block text-sm font-medium text-theme-muted mb-2"
            for="target-node"
          >
            Target {themeStore.resolveJargon("entity", 1)} (Primary)
          </label>
          <select
            id="target-node"
            bind:value={targetId}
            onchange={loadProposal}
            class="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
            disabled={isLoading}
          >
            {#each sourceNodeIds as id}
              <option value={id}>{vault.entities[id]?.title || id}</option>
            {/each}
          </select>
          <p class="text-xs text-theme-muted mt-1">
            This {themeStore.jargon.entity.toLowerCase()} will be updated. All others
            will be deleted.
          </p>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label
              class="block text-sm font-medium text-theme-muted"
              for="merge-preview">Merged Content Preview</label
            >
            <div
              class="flex bg-theme-bg border border-theme-border rounded p-0.5"
            >
              <button
                class="px-3 py-1 text-xs rounded transition-colors {strategy ===
                'concat'
                  ? 'bg-theme-surface text-theme-text shadow-sm'
                  : 'text-theme-muted hover:text-theme-text'}"
                onclick={() => {
                  strategy = "concat";
                  loadProposal();
                }}
                disabled={isLoading}
              >
                Concatenate
              </button>
              <button
                class="px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 {strategy ===
                'ai'
                  ? 'bg-theme-primary/20 text-theme-primary shadow-sm'
                  : 'text-theme-muted hover:text-theme-text'}"
                onclick={() => {
                  strategy = "ai";
                  loadProposal();
                }}
                disabled={isLoading}
              >
                <span class="icon-[lucide--sparkles] w-3.5 h-3.5"></span>
                AI Merge
              </button>
            </div>
          </div>

          {#if isLoading}
            <div
              class="h-64 flex items-center justify-center bg-theme-bg rounded border border-theme-border animate-pulse"
            >
              <span class="text-theme-muted">Generating preview...</span>
            </div>
          {:else}
            <textarea
              id="merge-preview"
              class="w-full h-64 bg-theme-bg border border-theme-border rounded p-3 font-mono text-sm text-theme-text focus:border-theme-primary focus:ring-1 focus:ring-theme-primary resize-none"
              bind:value={previewContent}
            ></textarea>
          {/if}
        </div>
      </div>

      <div
        class="p-6 border-t border-theme-border flex justify-end gap-3 bg-theme-surface/50"
      >
        <button
          class="px-4 py-2 text-theme-muted hover:text-theme-text transition-colors"
          onclick={() => onClose()}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          class="px-6 py-2 bg-theme-primary text-black font-bold rounded hover:bg-theme-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          onclick={handleMerge}
          disabled={!targetId || isLoading}
          aria-busy={isLoading}
        >
          {#if isLoading}
            <span
              class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
              aria-hidden="true"
            ></span>
            Processing...
          {:else}
            Confirm Merge
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
