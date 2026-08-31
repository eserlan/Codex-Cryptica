<script lang="ts">
  /**
   * Cloud Backup settings (spec 162, issue #2593).
   *
   * The consent screen is the load-bearing part of this feature, not a
   * formality: nothing leaves the device until it is confirmed, and it has to
   * say plainly what is stored, who can read it — including the hosting
   * provider — and how to get rid of it.
   */
  import { cloudBackupStore } from "$lib/stores/cloud-backup.svelte";
  import { parseRecoveryKey } from "@codex/cloud-backup-sync";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";

  let showConsent = $state(false);
  let showRestore = $state(false);
  let restoreKey = $state("");
  let busy = $state(false);
  let isSaving = $state(false);
  let codeVisible = $state(false);

  const status = $derived(cloudBackupStore.status);
  const isOn = $derived(status !== "off");
  const vaultId = $derived(vault.activeVaultId ?? "");

  const STATUS_LABEL: Record<string, string> = {
    off: "Off",
    idle: "Saved",
    syncing: "Saving…",
    error: "Last save failed",
  };

  const progress = $derived(cloudBackupStore.uploadProgress);
  /**
   * Media uploads one file at a time, so a big vault would otherwise sit on
   * "Saving…" with nothing moving.
   */
  const statusText = $derived(
    progress && progress.total > 0
      ? `Saving ${progress.uploaded} of ${progress.total} files…`
      : STATUS_LABEL[status],
  );

  const handleConsentKeydown = (event: KeyboardEvent) => {
    // Escape must dismiss without consenting — the same contract every other
    // modal in the app honours.
    if (showConsent && event.key === "Escape") showConsent = false;
  };

  const lastPushed = $derived(
    cloudBackupStore.lastPushedAt
      ? new Date(cloudBackupStore.lastPushedAt).toLocaleString()
      : null,
  );

  async function confirmConsent() {
    if (!vaultId) return;
    busy = true;
    let ok: boolean;
    try {
      ok = await cloudBackupStore.enable(vaultId);
    } finally {
      // Reset in `finally`: a stuck flag leaves the confirm button dead until
      // the page is reloaded.
      busy = false;
    }
    showConsent = false;
    notificationStore.notify(
      ok
        ? "Cloud backup is on. Your vault has been backed up."
        : (cloudBackupStore.errorMessage ?? "Could not turn on cloud backup."),
      ok ? "success" : "error",
    );
  }

  async function turnOff() {
    if (!vaultId) return;
    await cloudBackupStore.disable(vaultId);
    notificationStore.notify(
      "Cloud backup is off. Your existing backup is still stored until you delete it.",
      "success",
    );
  }

  async function deleteBackup() {
    if (!vaultId) return;
    const confirmed = await notificationStore.confirm({
      title: "Delete your cloud backup?",
      message:
        "This permanently erases the copy stored in Codex Cryptica Cloud. It cannot be restored afterwards. Your local vault is not affected.",
      confirmLabel: "Delete it",
      cancelLabel: "Keep it",
      isDangerous: true,
    });
    if (!confirmed) return;

    busy = true;
    let ok: boolean;
    try {
      ok = await cloudBackupStore.deleteBackup(vaultId);
    } finally {
      busy = false;
    }
    notificationStore.notify(
      ok
        ? "Your cloud backup has been deleted."
        : (cloudBackupStore.errorMessage ?? "Could not delete the backup."),
      ok ? "success" : "error",
    );
  }

  async function saveToCloud() {
    isSaving = true;
    let ok: boolean;
    try {
      ok = await cloudBackupStore.backUpNow();
    } finally {
      isSaving = false;
    }
    const skipped = cloudBackupStore.skippedAssets.length;
    notificationStore.notify(
      ok
        ? skipped > 0
          ? `Vault saved, but ${skipped} image${skipped === 1 ? "" : "s"} could not be read and ${skipped === 1 ? "is" : "are"} not in the backup.`
          : "Vault saved to Codex Cryptica Cloud."
        : (cloudBackupStore.errorMessage ?? "Could not save to the cloud."),
      ok ? (skipped > 0 ? "info" : "success") : "error",
    );
  }

  async function copyCode() {
    // The recovery key, not the bare code: restoring needs the backup id too,
    // and copying only half of what is required is what made restore
    // impossible from this panel alone.
    const key = await cloudBackupStore.revealRecoveryKey(vaultId);
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      notificationStore.notify("Recovery key copied.", "success");
    } catch {
      // Clipboard refused (permissions, insecure context) — show it instead so
      // the user can still copy it by hand.
      codeVisible = true;
    }
  }

  async function runRestore() {
    const parsed = parseRecoveryKey(restoreKey);
    if (!parsed) {
      notificationStore.notify(
        "That does not look like a recovery key. Copy it from the Settings of the device that made the backup.",
        "error",
      );
      return;
    }
    busy = true;
    // Lands in a new vault, so whatever is open is never silently replaced
    // (FR-006a). Nothing is created until the download has succeeded.
    let restored: Awaited<
      ReturnType<typeof cloudBackupStore.restoreIntoNewVault>
    >;
    try {
      restored = await cloudBackupStore.restoreIntoNewVault(
        parsed.backupId,
        parsed.ownerCode,
      );
    } finally {
      busy = false;
    }

    if (!restored) {
      notificationStore.notify(
        cloudBackupStore.errorMessage ??
          "That backup could not be found. Check the recovery key.",
        "error",
      );
      return;
    }
    showRestore = false;
    restoreKey = "";
    notificationStore.notify(
      restored.missingAssets > 0
        ? `Restored "${restored.vaultTitle}" into a new vault, but ${restored.missingAssets} image${restored.missingAssets === 1 ? "" : "s"} could not be recovered.`
        : `Restored "${restored.vaultTitle}" into a new vault. Your other vaults are unchanged.`,
      restored.missingAssets > 0 ? "info" : "success",
    );
  }
</script>

<svelte:window onkeydown={handleConsentKeydown} />

<section class="flex flex-col gap-4" aria-labelledby="cloud-backup-heading">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h3
        id="cloud-backup-heading"
        class="font-header text-base font-bold text-theme-text"
      >
        Cloud Backup
      </h3>
      <p class="mt-1 text-sm text-theme-muted">
        Keep a copy of this vault in Codex Cryptica Cloud, so you can get it
        back if you lose this device. Off unless you turn it on, and it only
        uploads when you press Save.
      </p>
    </div>

    {#if isOn}
      <span
        class="shrink-0 font-mono text-[10px] uppercase tracking-wider {status ===
        'error'
          ? 'text-red-400'
          : 'text-theme-primary'}"
        aria-live="polite"
      >
        {statusText}
      </span>
    {/if}
  </div>

  {#if !isOn}
    <button
      type="button"
      onclick={() => (showConsent = true)}
      disabled={busy || !vaultId}
      class="self-start bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
    >
      {cloudBackupStore.consented ? "Turn back on" : "Set up cloud backup"}
    </button>
  {:else}
    <div class="flex flex-col gap-2 border border-theme-border p-4">
      <p class="text-sm text-theme-muted">
        {#if lastPushed}
          Last saved {lastPushed}. Press Save to cloud whenever you want to
          update the stored copy.
        {:else}
          Not saved yet.
        {/if}
      </p>
      {#if status === "error" && cloudBackupStore.errorMessage}
        <p class="text-sm text-red-400" role="alert">
          {cloudBackupStore.errorMessage}
        </p>
      {/if}

      {#if codeVisible && cloudBackupStore.recoveryKey}
        <p class="break-all font-mono text-xs text-theme-text">
          {cloudBackupStore.recoveryKey}
        </p>
      {/if}

      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onclick={saveToCloud}
          disabled={isSaving || busy}
          class="bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-bg transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save to cloud"}
        </button>
        <button
          type="button"
          onclick={copyCode}
          class="border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-text"
        >
          Copy recovery key
        </button>
        <button
          type="button"
          onclick={turnOff}
          class="border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-text"
        >
          Turn off
        </button>
        <button
          type="button"
          onclick={deleteBackup}
          disabled={busy}
          class="border border-red-500/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          Delete backup
        </button>
      </div>
    </div>
  {/if}

  <button
    type="button"
    onclick={() => (showRestore = !showRestore)}
    class="self-start text-xs text-theme-muted underline underline-offset-4 transition-colors hover:text-theme-primary"
  >
    Load a vault from the cloud
  </button>

  {#if showRestore}
    <div class="flex flex-col gap-3 border border-theme-border p-4">
      <p class="text-sm text-theme-muted">
        Paste the recovery key from the Settings of the device that made the
        backup — the "Copy recovery key" button there. The vault is loaded into
        a new vault, so nothing you have open is replaced.
      </p>
      <label class="flex flex-col gap-1 text-xs text-theme-muted">
        Recovery key
        <input
          bind:value={restoreKey}
          placeholder="backup-id:ownership-code"
          class="border border-theme-border bg-theme-bg px-3 py-2 font-mono text-sm text-theme-text"
        />
      </label>
      <button
        type="button"
        onclick={runRestore}
        disabled={busy || !restoreKey.trim()}
        class="self-start bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg disabled:opacity-50"
      >
        Load from cloud
      </button>
    </div>
  {/if}
</section>

{#if showConsent}
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md"
      aria-label="Cancel cloud backup setup"
      onclick={() => (showConsent = false)}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-consent-title"
      tabindex="-1"
      use:focusTrap
      class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto border border-theme-border bg-theme-surface p-6"
    >
      <h2
        id="cloud-consent-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Before you turn on cloud backup
      </h2>

      <div
        class="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-theme-muted"
      >
        <p>
          <strong class="text-theme-text">What gets stored:</strong> everything in
          this vault — your entities, labels, notes, maps, canvases and the images
          they use.
        </p>
        <p>
          <strong class="text-theme-text">Where:</strong> Codex Cryptica Cloud, which
          runs on third-party hosting infrastructure.
        </p>
        <p>
          <strong class="text-theme-text">Who can read it:</strong> the backup is
          not end-to-end encrypted, so Codex Cryptica and its hosting provider are
          technically able to read its contents. It is never sold, forwarded to anyone
          else, or used to train AI.
        </p>
        <p>
          <strong class="text-theme-text">Your recovery key:</strong> turning this
          on creates a key that is the only way back to your backup. There are no
          accounts and no password reset. Copy it somewhere safe — if you lose it,
          and cannot tell support your vault's title, the backup is unreachable for
          good.
        </p>
        <p>
          <strong class="text-theme-text">Support access:</strong> if you lose the
          key, our support staff can look up a vault's title, size and last backup
          time to help you recover it. They cannot read your vault's contents.
        </p>
        <p>
          <strong class="text-theme-text">Turning it off:</strong> you can stop backing
          up, or permanently delete the stored copy, at any time from this screen.
        </p>
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onclick={() => (showConsent = false)}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-text"
        >
          Not now
        </button>
        <button
          type="button"
          onclick={confirmConsent}
          disabled={busy}
          class="bg-theme-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
        >
          I understand — turn it on
        </button>
      </div>
    </div>
  </div>
{/if}
