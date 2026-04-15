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

  const vaultId = $derived(
    (page.params as { id: string; entityId: string }).id,
  );
  const entityId = $derived(
    (page.params as { id: string; entityId: string }).entityId,
  );

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
      const vid = vaultId;
      const eid = entityId;

      if (!vid || !eid) return;

      // 1. Try to get guest payload synchronously (from sessionStorage)
      let payload = consumeZenPopoutPayload(vid, eid);

      // 2. If not found but we have an opener, request it via postMessage
      if (!payload && window.opener) {
        uiStore.isGuestMode = true; // Set early to prevent default vault load
        payload = await requestZenPopoutPayload(eid);
      }

      if (payload) {
        // Guest Flow
        const loadedEntityId = applyGuestPayload(payload);
        if (vault.entities[loadedEntityId]) {
          uiStore.openZenMode(loadedEntityId);
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
          while (!vault.isInitialized && retries < 100) {
            await new Promise((r) => setTimeout(r, 50));
            retries++;
          }
        }

        if (vault.entities[eid]) {
          uiStore.openZenMode(eid);
        } else {
          console.warn(
            `[Entity Popout] Entity ${eid} not found in vault ${vid}`,
          );
        }
      }
    };

    initEntityView();
  });
</script>

<svelte:head>
  <title
    >{(entityId ? vault.entities[entityId]?.title : null) ?? "Entity"} | Codex Cryptica</title
  >
</svelte:head>

<!-- Full-screen dark backdrop — ZenModeModal overlays this -->
<div class="h-screen bg-black"></div>
