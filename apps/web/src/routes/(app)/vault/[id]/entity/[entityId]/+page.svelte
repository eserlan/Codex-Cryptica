<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import {
    consumeZenPopoutPayload,
    requestZenPopoutPayload,
    type ZenPopoutPayload,
  } from "$lib/utils/zen-popout";

  const VAULT_INIT_TIMEOUT_MS = 5000;
  const VAULT_INIT_POLL_MS = 50;
  const MAX_VAULT_INIT_RETRIES = VAULT_INIT_TIMEOUT_MS / VAULT_INIT_POLL_MS;

  const vaultId = $derived(
    (page.params as { id: string; entityId: string }).id,
  );
  const entityId = $derived(
    (page.params as { id: string; entityId: string }).entityId,
  );

  let error = $state<string | null>(null);

  const applyGuestPayload = (payload: ZenPopoutPayload) => {
    vault.repository.entities[payload.entity.id] = {
      ...payload.entity,
      _path:
        typeof payload.entity._path === "string"
          ? [payload.entity._path]
          : payload.entity._path,
    };
    vault.isInitialized = true;
    vault.status = "idle";
    if (payload.isGuest) uiStore.isGuestMode = true;
    return payload.entity.id;
  };

  onMount(() => {
    const initEntityView = async () => {
      try {
        const vid = vaultId;
        const eid = entityId;

        if (!vid || !eid) {
          error = "Vault ID or Entity ID is missing.";
          return;
        }

        // 1. Try to get guest payload synchronously (from sessionStorage)
        let payload = consumeZenPopoutPayload(vid, eid);

        // 2. If not found but we have an opener, request it via postMessage
        if (!payload && window.opener) {
          uiStore.isGuestMode = true; // Set early to prevent default vault load
          payload = await requestZenPopoutPayload(eid);

          if (!payload) {
            error =
              "Guest handshake failed. The host window may have been closed or the session timed out.";
            return;
          }
        }

        if (payload) {
          // Guest Flow (or Handover Flow)
          const loadedEntityId = applyGuestPayload(payload);
          if (vault.entities[loadedEntityId]) {
            uiStore.openZenMode(loadedEntityId);
          } else {
            error = `Failed to load entity ${loadedEntityId} into memory.`;
          }
        } else {
          // Host Flow
          uiStore.isGuestMode = false;
          if (vault.activeVaultId !== vid) {
            await vault.switchVault(vid);
          } else {
            // If this vault was already active from LocalStorage restoration,
            // we must wait for its background initialization (OPFS read) to finish.
            let retries = 0;
            while (!vault.isInitialized && retries < MAX_VAULT_INIT_RETRIES) {
              await new Promise((r) => setTimeout(r, VAULT_INIT_POLL_MS));
              retries++;
            }

            if (!vault.isInitialized) {
              error =
                "Vault initialization timed out. Please refresh the page.";
              return;
            }
          }

          if (vault.entities[eid]) {
            uiStore.openZenMode(eid);
          } else {
            error = `Entity "${eid}" not found in vault "${vid}".`;
            console.warn(
              `[Entity Popout] Entity ${eid} not found in vault ${vid}`,
            );
          }
        }
      } catch (err) {
        console.error("[Entity Popout] Unexpected initialization error:", err);
        error = "An unexpected error occurred while preparing the entity view.";
      }
    };

    void initEntityView();
  });
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this if successful -->
<div class="h-screen bg-black flex items-center justify-center p-6">
  {#if error}
    <div class="max-w-md text-center">
      <div
        class="icon-[lucide--alert-triangle] w-12 h-12 text-theme-primary/50 mx-auto mb-4"
      ></div>
      <h1
        class="text-theme-primary font-header text-xl font-bold uppercase tracking-widest mb-4"
      >
        View Error
      </h1>
      <p class="text-theme-text/80 text-sm mb-8 leading-relaxed">
        {error}
      </p>
      <button
        onclick={() => window.close()}
        class="px-8 py-2.5 bg-theme-primary text-theme-bg rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-theme-secondary transition-all active:scale-95 shadow-lg"
      >
        Close Tab
      </button>
    </div>
  {/if}
</div>
