<script lang="ts">
  /**
   * Attach-to-existing-backup panel (Cloud Backup third path).
   *
   * Beside "set up" (a new backup) and "load into a new vault" (restore): a
   * vault that is already on this device adopts the cloud copy identified by
   * a recovery key, so the next save pushes there instead of forking a second
   * backup. Split out of `CloudBackupSettings` so that panel's template stays
   * under its complexity budget.
   */
  import { cloudBackupStore } from "$lib/stores/cloud-backup.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { parseRecoveryKey } from "@codex/cloud-backup-sync";

  interface Props {
    /** The open vault that will adopt the cloud copy. */
    vaultId: string;
    /** Local name, so the adopted backup lists under a familiar title. */
    vaultName?: string;
  }

  const { vaultId, vaultName }: Props = $props();

  let showAttach = $state(false);
  let attachKey = $state("");
  let busy = $state(false);

  async function runAttach() {
    const parsed = parseRecoveryKey(attachKey);
    if (!parsed) {
      notificationStore.notify(
        "That does not look like a recovery key. Copy it from the Settings of the device that made the backup.",
        "error",
      );
      return;
    }
    busy = true;
    let ok: boolean;
    try {
      ok = await cloudBackupStore.attachToExistingBackup(
        vaultId,
        parsed.backupId,
        parsed.ownerCode,
        vaultName,
      );
    } finally {
      busy = false;
    }
    if (!ok) {
      notificationStore.notify(
        cloudBackupStore.errorMessage ??
          "That backup could not be reached. Check the recovery key.",
        "error",
      );
      return;
    }
    showAttach = false;
    attachKey = "";
    notificationStore.notify(
      "This vault is now linked to the cloud backup. Press Save to cloud to push your changes.",
      "success",
    );
  }
</script>

<button
  type="button"
  onclick={() => (showAttach = !showAttach)}
  class="self-start text-xs text-theme-muted underline underline-offset-4 transition-colors hover:text-theme-primary"
>
  Attach this vault to an existing backup
</button>

{#if showAttach}
  <div class="flex flex-col gap-3 border border-theme-border p-4">
    <p class="text-sm text-theme-muted">
      Already saving this vault from another device? Paste that backup's
      recovery key to link this vault to the same cloud copy, instead of
      starting a second one. The next save replaces the cloud copy with what is
      here.
    </p>
    <label class="flex flex-col gap-1 text-xs text-theme-muted">
      Recovery key
      <input
        bind:value={attachKey}
        placeholder="backup-id:ownership-code"
        class="border border-theme-border bg-theme-bg px-3 py-2 font-mono text-sm text-theme-text"
      />
    </label>
    <button
      type="button"
      onclick={runAttach}
      disabled={busy || !attachKey.trim()}
      class="self-start bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg disabled:opacity-50"
    >
      Attach to this backup
    </button>
  </div>
{/if}
