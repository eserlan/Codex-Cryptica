<script lang="ts">
  import { building, browser } from "$app/environment";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import GuestLoginModal from "$lib/components/modals/GuestLoginModal.svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import {
    buildGuestRoutePath,
    normalizeGuestView,
  } from "$lib/utils/guest-session";
  import { mergeGuestEntityUpdate } from "$lib/utils/guest-entity-merge";
  import { buildGuestPresencePayload } from "$lib/cloud-bridge/p2p/p2p-helpers";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { vaultEventBus } from "$lib/stores/vault/events.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { untrack } from "svelte";

  const shareId = $derived(
    building ? null : page.url.searchParams.get("shareId"),
  );
  const guestView = $derived(
    building ? null : normalizeGuestView(page.url.searchParams.get("view")),
  );
  const isGuestMode = $derived(!!shareId);
  let joinRejectionMessage = $state<string | null>(null);
  let isConnectedToHost = $state(false);

  const syncGuestGraphPayload = (graph: any) => {
    // ⚡ Bolt Optimization: Replace multiple intermediate array allocations (Object.entries().map(),
    // array.map(), Object.fromEntries()) with a single imperative loop to process vault entities.
    const nextEntities: Record<string, any> = {};
    const sourceEntities = graph.entities || {};

    for (const id in sourceEntities) {
      if (Object.hasOwn(sourceEntities, id)) {
        const entity = sourceEntities[id];
        nextEntities[id] = {
          ...entity,
          id,
          _path: typeof entity._path === "string" ? [entity._path] : entity._path,
        };
      }
    }

    vault.repository.entities = nextEntities;

    if (graph.defaultVisibility) {
      vault.defaultVisibility = graph.defaultVisibility;
    }

    if (graph.themeId) {
      themeStore.previewTheme(graph.themeId);
    }

    // Explicitly set a vault ID and emit lifecycle events so services (like search/RAG) initialize correctly
    vaultRegistry.activeVaultId = `guest-${shareId}`;

    vaultEventBus.emit({
      type: "VAULT_OPENING",
      vaultId: vaultRegistry.activeVaultId!,
    });

    vaultEventBus.emit({
      type: "CACHE_LOADED",
      vaultId: vaultRegistry.activeVaultId!,
      entities: vault.repository.entities,
    });

    sessionModeStore.sharedMode = true;
    vault.isInitialized = true;
    vault.status = "idle";
  };

  const navigateToGuestView = async () => {
    if (!browser) return;
    const targetPath = buildGuestRoutePath(base, guestView);
    if (!targetPath || page.url.pathname === targetPath) return;

    const nextUrl = new URL(page.url);
    nextUrl.pathname = targetPath;
    nextUrl.searchParams.set("shareId", shareId ?? "");
    if (guestView) {
      nextUrl.searchParams.set("view", guestView);
    }

    await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
      replaceState: true,
    });
  };

  // Handle browser window/tab close
  $effect(() => {
    if (!browser || !isConnectedToHost) return;

    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // Best-effort synchronous leave; leaveSession() sends and disconnects
      try {
        void p2pGuestService.leaveSession();
      } catch {
        // Ignore errors during unload
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  });

  $effect(() => {
    if (
      !isGuestMode ||
      !shareId ||
      !shareId.startsWith("p2p-") ||
      !sessionModeStore.guestUsername
    ) {
      return;
    }

    const peerId = shareId.substring(4);

    untrack(() => {
      sessionModeStore.isGuestMode = true;
      vault.status = "loading";
      vault.selectedEntityId = null;

      p2pGuestService
        .connectToHost(
          peerId,
          (graph) => {
            syncGuestGraphPayload(graph);
          },
          (updatedEntity) => {
            const oldEntity = vault.repository.entities[updatedEntity.id];
            const newEntity = mergeGuestEntityUpdate(oldEntity, updatedEntity);
            vault.repository.entities[updatedEntity.id] = newEntity;

            vaultEventBus.emit({
              type: "ENTITY_UPDATED",
              vaultId: vault.activeVaultId!,
              entity: newEntity,
              patch: updatedEntity,
            });
          },
          (deletedId) => {
            delete vault.repository.entities[deletedId];

            vaultEventBus.emit({
              type: "ENTITY_DELETED",
              vaultId: vault.activeVaultId!,
              entityId: deletedId,
            });
          },
          (batchUpdates) => {
            vault.batchUpdate(batchUpdates);
          },
          (themeId) => {
            themeStore.previewTheme(themeId);
          },
          sessionModeStore.guestUsername ?? undefined,
          (reason, displayName) => {
            if (reason === "duplicate-display-name") {
              joinRejectionMessage = `Display name "${displayName}" is already in use. Choose a different name.`;
            } else {
              joinRejectionMessage = `Join request was rejected: ${reason}`;
            }
          },
        )
        .then(() => {
          isConnectedToHost = true;
          return navigateToGuestView();
        })
        .catch((err) => {
          console.error("[Guest Mode] Failed to connect to host:", err);
          vault.selectedEntityId = null;
          sessionModeStore.guestUsername = null;
          sessionModeStore.isGuestMode = false;
          vault.status = "error";
          vault.errorMessage = "Failed to connect to shared campaign.";
        });
    });
  });

  $effect(() => {
    if (
      !isGuestMode ||
      !sessionModeStore.isGuestMode ||
      !sessionModeStore.guestUsername
    ) {
      return;
    }

    const { status, currentEntityId, currentEntityTitle } =
      buildGuestPresencePayload({
        selectedEntityId: vault.selectedEntityId,
        zenModeEntityId: modalUIStore.showZenMode
          ? modalUIStore.zenModeEntityId
          : null,
        entities: vault.entities,
      });

    untrack(() => {
      p2pGuestService.updateGuestStatus({
        status,
        currentEntityId,
        currentEntityTitle,
      });
    });
  });
</script>

{#if isGuestMode && !sessionModeStore.guestUsername && !building}
  <GuestLoginModal
    onJoin={(username) => sessionModeStore.setGuestUsername(username)}
    rejectionMessage={joinRejectionMessage}
  />
{/if}
