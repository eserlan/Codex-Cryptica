<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { fade, scale } from "svelte/transition";
  import type { VaultRecord } from "$lib/utils/idb";

  let { onClose } = $props<{ onClose: () => void }>();

  let isLoading = $state(false);
  let showCreate = $state(false);
  let newVaultName = $state("");
  let editingId = $state<string | null>(null);
  let editName = $state("");
  let deletingId = $state<string | null>(null);

  const handleSwitch = async (id: string) => {
    if (id === vault.activeVaultId) return;
    isLoading = true;
    try {
      await vault.switchVault(id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const handleRename = async () => {
    if (!editingId || !editName.trim()) return;
    isLoading = true;
    try {
      await vault.renameVault(editingId, editName);
      editingId = null;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    isLoading = true;
    try {
      await vault.deleteVault(deletingId);
      deletingId = null;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const startRename = (v: VaultRecord) => {
    editingId = v.id;
    editName = v.name;
  };

  const handleCreate = async () => {
    if (!newVaultName.trim()) return;
    isLoading = true;
    try {
      await vault.createVault(newVaultName);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const handleImport = async () => {
    if (!newVaultName.trim()) return;
    isLoading = true;
    try {
      // 1. Get handle immediately (must be user triggered)
      const handle = await window.showDirectoryPicker({ mode: "read" });

      // 2. Create the vault
      const _id = await vault.createVault(newVaultName);

      // 3. Trigger import into that vault using the handle we already got
      // Note: vault.switchVault is called inside createVault,
      // so vault.importFromFolder will use the correct destination.
      const success = await vault.importFromFolder(handle);

      // Only close if we actually finished or the user didn't cancel/fail
      if (success) {
        onClose();
      }
    } catch (e) {
      console.error(e);
      // Errors are primarily handled by vault.errorMessage now
    } finally {
      isLoading = false;
    }
  };

  const handleImportToVault = async (v: VaultRecord) => {
    isLoading = true;
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      if (v.id !== vault.activeVaultId) {
        await vault.switchVault(v.id);
      }
      await vault.importFromFolder(handle);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error(e);
    } finally {
      isLoading = false;
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  transition:fade
  data-testid="vault-switcher-modal"
>
  <div role="dialog" aria-modal="true" aria-labelledby="vault-selector-title"
    class="bg-theme-surface border border-theme-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
    transition:scale
  >
    <div
      class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg"
    >
      <h2 id="vault-selector-title" class="text-lg font-bold text-theme-primary tracking-wide">
        VAULT SELECTOR
      </h2>
      <button onclick={onClose} class="text-theme-muted hover:text-theme-text" title="Close Selector" aria-label="Close Selector">
        <span class="icon-[lucide--x] w-5 h-5"></span>
      </button>
    </div>

    <div class="overflow-y-auto p-2 space-y-1 flex-1 bg-theme-bg/50 relative">
      {#each vault.availableVaults as v (v.id)}
        <div
          class="w-full text-left p-3 rounded border transition-all flex justify-between items-center group
            {v.id === vault.activeVaultId
            ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
            : 'bg-theme-surface border-transparent hover:border-theme-border hover:bg-theme-surface/80 text-theme-text'}"
        >
          {#if editingId === v.id}
            <form
              class="flex-1 flex gap-2 items-center"
              onsubmit={(e) => {
                e.preventDefault();
                handleRename();
              }}
            >
              <input
                bind:value={editName}
                aria-label="New vault name"
                class="bg-theme-bg border border-theme-primary rounded px-2 py-1 text-sm flex-1 text-theme-text focus:outline-none"
                onclick={(e) => e.stopPropagation()}
              />
              <button
                type="submit"
                class="text-theme-primary px-2 hover:bg-theme-primary/10 rounded py-1"
                disabled={isLoading}
                title="Save Name"
                aria-label="Save Name"
              >
                <span class="icon-[lucide--check] w-4 h-4"></span>
              </button>
              <button
                type="button"
                class="text-theme-muted px-2 hover:bg-theme-border rounded py-1"
                onclick={() => (editingId = null)}
                title="Cancel Rename"
                aria-label="Cancel Rename"
              >
                <span class="icon-[lucide--x] w-4 h-4"></span>
              </button>
            </form>
          {:else}
            <button
              class="flex-1 text-left disabled:opacity-50"
              onclick={() => handleSwitch(v.id)}
              disabled={isLoading || !!deletingId || !!editingId}
            >
              <div class="font-bold text-sm flex items-center gap-2">
                {v.name}
                {#if v.id === vault.activeVaultId}
                  <span
                    class="text-[10px] bg-theme-primary text-theme-bg px-1.5 py-0.5 rounded-full font-mono"
                    >ACTIVE</span
                  >
                {/if}
              </div>
              <div class="text-xs text-theme-muted mt-1 font-mono">
                Last opened: {formatDate(v.lastOpenedAt)}
              </div>
            </button>

            <div class="text-right flex items-center gap-1 pl-2">
              <div
                class="text-xs font-mono text-theme-secondary mr-2 hidden sm:block"
              >
                {v.entityCount || 0} Items
              </div>

              <button
                class="p-1.5 hover:bg-theme-border rounded text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100 transition-opacity"
                onclick={() => handleImportToVault(v)}
                title="Restore from Folder"
                disabled={isLoading || !!deletingId || !!editingId}
              >
                <span class="icon-[lucide--folder-up] w-3.5 h-3.5"></span>
              </button>

              <button
                class="p-1.5 hover:bg-theme-border rounded text-theme-muted hover:text-theme-primary opacity-0 group-hover:opacity-100 transition-opacity"
                onclick={() => startRename(v)}
                title="Rename"
                disabled={isLoading || !!deletingId || !!editingId}
              >
                <span class="icon-[lucide--edit-2] w-3.5 h-3.5"></span>
              </button>

              {#if v.id !== vault.activeVaultId}
                <button
                  class="p-1.5 hover:bg-red-900/20 rounded text-theme-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onclick={() => (deletingId = v.id)}
                  title="Delete"
                  disabled={isLoading || !!deletingId || !!editingId}
                >
                  <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}

      {#if deletingId}
        <div
          class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px] z-50 p-4 rounded"
          transition:fade={{ duration: 100 }}
        >
          <div
            class="bg-theme-surface border border-red-500/50 rounded-lg p-4 shadow-2xl max-w-xs w-full animate-in zoom-in-95"
          >
            <h3
              class="text-red-500 font-bold mb-2 flex items-center gap-2 text-sm tracking-wider"
            >
              <span class="icon-[lucide--alert-triangle] w-4 h-4"></span> DELETE VAULT?
            </h3>
            <p class="text-xs text-theme-text mb-4 leading-relaxed">
              This will permanently delete "<strong
                >{vault.availableVaults.find((v) => v.id === deletingId)
                  ?.name}</strong
              >" and all its files. This action cannot be undone.
            </p>
            <div class="flex justify-end gap-2">
              <button
                class="px-3 py-1.5 rounded text-xs border border-theme-border hover:bg-theme-bg text-theme-text font-bold"
                onclick={() => (deletingId = null)}>CANCEL</button
              >
              <button
                class="px-3 py-1.5 rounded text-xs bg-red-600 text-white hover:bg-red-700 font-bold"
                onclick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? "DELETING..." : "DELETE FOREVER"}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div
      class="p-4 border-t border-theme-border bg-theme-surface flex justify-between gap-2 items-center min-h-[4rem]"
    >
      {#if showCreate}
        <form
          class="flex gap-2 flex-1 animate-in fade-in slide-in-from-bottom-1"
          onsubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <input
            bind:value={newVaultName}
            placeholder="Vault Name..."
            class="border border-theme-border rounded px-3 py-1.5 text-sm flex-1 bg-theme-bg text-theme-text focus:outline-none focus:border-theme-primary"
          />
          {#if vault.errorMessage}
            <div
              class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs flex items-center gap-2"
            >
              <span class="icon-[lucide--alert-circle] w-4 h-4 shrink-0"></span>
              <p>{vault.errorMessage}</p>
            </div>
          {/if}

          <div class="flex justify-end gap-3 mt-8">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text transition-colors"
              onclick={() => (showCreate = false)}
              disabled={isLoading}
            >
              CANCEL
            </button>
            <div class="flex gap-2">
              <button
                type="submit"
                class="px-6 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold text-sm rounded shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !newVaultName.trim()}
              >
                {isLoading ? "CREATING..." : "CREATE"}
              </button>
              <button
                type="button"
                class="px-6 py-2 bg-theme-accent hover:bg-theme-accent-hover text-black font-bold text-sm rounded shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={handleImport}
                disabled={isLoading || !newVaultName.trim()}
              >
                {#if isLoading && vault.status === "loading"}
                  <span class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin"
                  ></span>
                  IMPORTING...
                {:else}
                  <span class="icon-[lucide--folder-up] w-3.5 h-3.5"></span>
                  IMPORT
                {/if}
              </button>
            </div>
          </div>
        </form>
      {:else}
        <button
          class="text-theme-primary text-sm font-bold flex items-center gap-2 hover:text-theme-secondary transition-colors"
          onclick={() => (showCreate = true)}
        >
          <span class="icon-[lucide--plus] w-4 h-4"></span> NEW VAULT
        </button>
        <button
          class="px-4 py-2 bg-theme-surface border border-theme-border rounded text-sm hover:text-theme-primary transition-colors"
          onclick={onClose}
        >
          DONE
        </button>
      {/if}
    </div>
  </div>
</div>
