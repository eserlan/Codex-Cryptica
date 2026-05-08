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
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";

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
    vault.repository.entities = Object.fromEntries(
      Object.entries(graph.entities).map(([id, entity]: [string, any]) => [
        id,
        {
          ...entity,
          _path:
            typeof entity._path === "string" ? [entity._path] : entity._path,
        },
      ]),
    );

    if (graph.defaultVisibility) {
      vault.defaultVisibility = graph.defaultVisibility;
    }

    if (graph.themeId) {
      themeStore.previewTheme(graph.themeId);
    }

    uiStore.sharedMode = true;
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
      // Send leave message synchronously (best effort)
      try {
        const connection = (p2pGuestService as any).connection;
        if (connection?.open) {
          connection.send({
            type: "GUEST_LEAVE",
            payload: { displayName: uiStore.guestUsername },
          });
        }
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
      !uiStore.guestUsername
    ) {
      return;
    }

    const peerId = shareId.substring(4);
    uiStore.isGuestMode = true;
    vault.status = "loading";
    vault.selectedEntityId = null;

    p2pGuestService
      .connectToHost(
        peerId,
        (graph) => {
          syncGuestGraphPayload(graph);
        },
        (updatedEntity) => {
          vault.repository.entities[updatedEntity.id] = mergeGuestEntityUpdate(
            vault.repository.entities[updatedEntity.id],
            updatedEntity,
          );
        },
        (deletedId) => {
          delete vault.repository.entities[deletedId];
        },
        (batchUpdates) => {
          vault.batchUpdate(batchUpdates);
        },
        (themeId) => {
          themeStore.previewTheme(themeId);
        },
        uiStore.guestUsername ?? undefined,
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
        uiStore.guestUsername = null;
        uiStore.isGuestMode = false;
        vault.status = "error";
        vault.errorMessage = "Failed to connect to shared campaign.";
      });
  });

  $effect(() => {
    if (!isGuestMode || !uiStore.isGuestMode || !uiStore.guestUsername) {
      return;
    }

    const { status, currentEntityId, currentEntityTitle } =
      buildGuestPresencePayload({
        selectedEntityId: vault.selectedEntityId,
        zenModeEntityId: uiStore.showZenMode ? uiStore.zenModeEntityId : null,
        entities: vault.entities,
      });

    p2pGuestService.updateGuestStatus({
      status,
      currentEntityId,
      currentEntityTitle,
    });
  });
</script>

{#if isGuestMode && !uiStore.guestUsername && !building}
  <GuestLoginModal
    onJoin={(username) => uiStore.setGuestUsername(username)}
    rejectionMessage={joinRejectionMessage}
  />
{/if}
