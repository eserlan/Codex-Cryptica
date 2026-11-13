<script lang="ts">
  import type { ArtworkBackupConsent } from "#lib/stores/cloud-backup-artwork-consent.js";
  let {
    vaultId,
    refreshKey,
    read,
    set,
    confirm,
  }: {
    vaultId: string;
    refreshKey?: string | number | null;
    read: (vaultId: string) => Promise<ArtworkBackupConsent | null>;
    set: (
      vaultId: string,
      enabled: boolean,
      confirmed: boolean,
    ) => Promise<boolean>;
    confirm: (options: {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      isDangerous?: boolean;
    }) => Promise<boolean>;
  } = $props();
  let consentState = $state<ArtworkBackupConsent | null>(null);
  let busy = $state(false);
  let error = $state(false);
  $effect(() => {
    const id = vaultId;
    const _refreshKey = refreshKey;
    let current = true;
    consentState = null;
    void read(id)
      .then((value) => {
        if (current) consentState = value;
      })
      .catch(() => {
        if (current) error = true;
      });
    return () => {
      current = false;
    };
  });
  function confirmInclusion(): Promise<boolean> {
    return confirm({
      title: "Include adventures in cloud backup?",
      message:
        "This adds adventure transcripts, private GM notes, artwork choices and kept pictures to your backup. Cloudflare hosts the data. The backup is not end-to-end encrypted, so Codex Cryptica staff and Cloudflare can technically read it; support can also see backup metadata. It is not sold, shared onward or used to train AI. You can turn this inclusion off here to remove the added cloud data, or delete the whole backup. Your local Vault stays on this device.",
      confirmLabel: "Include adventures",
      cancelLabel: "Not now",
    });
  }

  function confirmIfEnabling(enabled: boolean): Promise<boolean> {
    return enabled ? confirmInclusion() : Promise.resolve(true);
  }

  async function applyConsentChange(id: string, enabled: boolean) {
    busy = true;
    error = false;
    try {
      if (!(await set(id, enabled, true))) error = true;
      const next = await read(id);
      if (id === vaultId) consentState = next;
    } catch {
      if (id === vaultId) error = true;
    } finally {
      busy = false;
    }
  }

  async function change(enabled: boolean) {
    const id = vaultId;
    if (busy || !id) return;
    if (!(await confirmIfEnabling(enabled))) return;
    if (id !== vaultId) return;
    await applyConsentChange(id, enabled);
  }
</script>

<div class="border-t border-theme-border pt-3 text-sm text-theme-text">
  <p class="font-semibold">Adventure backup</p>
  <p class="mt-1 text-theme-text">
    Adventure transcripts, GM notes and kept illustrations are optional and stay
    on this device until you include them.
  </p>
  {#if consentState?.remoteRemovalPending}
    <p class="mt-2" role="status">
      Removal from cloud is pending. Your local adventures are unchanged.
    </p>
    <button
      type="button"
      class="mt-2 min-h-10 rounded border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={busy}
      onclick={() => void change(false)}>Retry removal</button
    >
  {:else if consentState?.enabled}
    <p class="mt-2">Adventures are included in this backup.</p>
    <button
      type="button"
      class="mt-2 min-h-10 rounded border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={busy}
      onclick={() => void change(false)}>Remove adventures from backup</button
    >
  {:else if consentState}
    <button
      type="button"
      class="mt-2 min-h-10 rounded border border-theme-border px-3 focus-visible:outline-2 focus-visible:outline-theme-primary"
      disabled={busy}
      onclick={() => void change(true)}>Include adventures</button
    >
  {:else}<p class="mt-2">Adventure backup settings are unavailable.</p>{/if}
  {#if error}<p role="status" class="mt-2">
      Could not update adventure backup. Please try again.
    </p>{/if}
</div>
