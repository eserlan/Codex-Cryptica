<script lang="ts">
  /**
   * Picks the one cloud this vault is mirrored to.
   *
   * Google Drive and Codex Cryptica Cloud each hold a whole-vault copy and each
   * restore over the local one, so having both on leaves the vault with two
   * competing sources of truth. This panel makes the choice explicit and
   * exclusive, and shows only the chosen destination's controls.
   */
  import { onMount } from "svelte";
  import { driveStore } from "$lib/stores/drive.svelte";
  import { cloudBackupStore } from "$lib/stores/cloud-backup.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { getDB } from "$lib/utils/idb";
  import { SyncRegistry, CloudSyncMetadataService } from "@codex/sync-engine";
  import {
    resolveCloudDestination,
    canSelectDestination,
    DESTINATION_LABEL,
    type CloudDestination,
  } from "$lib/services/cloud-destination";
  import DriveSettings from "./DriveSettings.svelte";
  import CloudBackupSettings from "./CloudBackupSettings.svelte";

  const destination = $derived(
    resolveCloudDestination({
      driveConnected: !!driveStore.metadata,
      cloudBackupOn: cloudBackupStore.status !== "off",
    }),
  );

  /**
   * What the user is looking at. Follows the live destination, but can be moved
   * ahead of it so someone with nothing set up can read a panel before
   * committing to it.
   */
  let viewing = $state<CloudDestination | null>(null);
  const selected = $derived(viewing ?? destination.active);

  const OPTIONS: {
    id: CloudDestination;
    icon: string;
    summary: string;
  }[] = [
    {
      id: "none",
      icon: "icon-[lucide--hard-drive]",
      summary: "This vault lives only on this device.",
    },
    {
      id: "drive",
      icon: "icon-[lucide--cloud]",
      summary: "Mirror to a folder in your own Google Drive.",
    },
    {
      id: "cc-cloud",
      icon: "icon-[lucide--cloud-upload]",
      summary: "Keep a copy in Codex Cryptica Cloud, restorable with a code.",
    },
  ];

  async function loadDriveMetadata() {
    if (!vault.activeVaultId) return;
    try {
      const db = await getDB();
      const service = new CloudSyncMetadataService(new SyncRegistry(db));
      driveStore.metadata =
        (await service.getMetadata(vault.activeVaultId)) ?? null;
    } catch {
      // A failed lookup must not blank the panel: leaving the store as it is
      // means the picker shows the last known state rather than a wrong one.
    }
  }

  onMount(loadDriveMetadata);

  function choose(target: CloudDestination) {
    const verdict = canSelectDestination(target, destination);
    if (!verdict.allowed) {
      notificationStore.notify(verdict.reason ?? "", "info");
      // Still show the live destination's panel, which is where the controls
      // for turning it off are.
      viewing = destination.active;
      return;
    }
    viewing = target;
  }
</script>

<section
  class="flex flex-col gap-4"
  aria-labelledby="cloud-destination-heading"
>
  <div>
    <h3
      id="cloud-destination-heading"
      class="flex items-center gap-2 font-header text-base font-bold text-theme-text"
    >
      <span class="icon-[lucide--cloud] h-5 w-5 text-theme-primary"></span>
      Cloud copy
    </h3>
    <p class="mt-1 text-sm text-theme-muted">
      Where this vault is copied to, so you can get it back on another device.
      Pick one — a vault can only be mirrored to a single cloud.
    </p>
  </div>

  {#if destination.conflict}
    <div
      class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-theme-muted"
      role="status"
    >
      <span class="font-bold text-amber-500">Both are switched on.</span>
      This vault is set up with Google Drive and Codex Cryptica Cloud at once, which
      is no longer allowed because each can restore over the other. Turn one off below;
      whichever you keep holds the copy.
    </div>
  {/if}

  <div
    class="grid gap-2 sm:grid-cols-3"
    role="radiogroup"
    aria-label="Cloud destination"
  >
    {#each OPTIONS as option (option.id)}
      {@const isSelected = selected === option.id}
      {@const isActive = destination.active === option.id}
      {@const blocked = !canSelectDestination(option.id, destination).allowed}
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onclick={() => choose(option.id)}
        class="flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors {isSelected
          ? 'border-theme-primary bg-theme-primary/5'
          : 'border-theme-border bg-theme-surface hover:border-theme-primary/40'} {blocked
          ? 'opacity-60'
          : ''}"
      >
        <span
          class="flex items-center gap-2 text-sm font-medium text-theme-text"
        >
          <span class="{option.icon} h-4 w-4 text-theme-primary"></span>
          {DESTINATION_LABEL[option.id]}
          {#if isActive && option.id !== "none"}
            <span
              class="ml-auto font-mono text-[10px] uppercase tracking-wider text-theme-primary"
              >In use</span
            >
          {/if}
        </span>
        <span class="text-xs leading-relaxed text-theme-muted"
          >{option.summary}</span
        >
      </button>
    {/each}
  </div>

  {#if selected === "drive"}
    <div class="border-t border-theme-border pt-4">
      <DriveSettings />
    </div>
  {:else if selected === "cc-cloud"}
    <div class="border-t border-theme-border pt-4">
      <CloudBackupSettings />
    </div>
  {:else}
    <p class="text-xs leading-relaxed text-theme-muted">
      Nothing is uploaded anywhere. You can still make a portable backup file
      below, which works in every browser and needs no account.
    </p>
  {/if}
</section>
