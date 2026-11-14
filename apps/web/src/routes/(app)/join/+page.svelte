<script lang="ts">
  /**
   * A member joins a shared vault from the group link (shared vault slice 8).
   *
   * The link's credential is read once, kept only in this component's memory
   * and sent only to the cloud backup service when the member confirms. Until
   * then nothing is requested and nothing is written.
   */
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { parseShareLinkFragment } from "@codex/cloud-backup-sync";
  import { takeJoinFragment } from "#lib/utils/join-fragment.js";
  import { sharedVaultIdentity } from "#lib/stores/shared-vault-identity.js";
  import { createSharedVaultJoin } from "#lib/app/init/cloud-backup-config.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

  let link = $state<{ backupId: string; editorToken: string } | null>(null);
  let ready = $state(false);
  let name = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);
  let ownedVaultId = $state<string | null>(null);

  const trimmed = $derived(name.trim());

  onMount(() => {
    const fragment = takeJoinFragment();
    link = fragment === null ? null : parseShareLinkFragment(fragment);
    if (link) name = sharedVaultIdentity.displayName() ?? "";
    ready = true;
  });

  async function join() {
    if (!link || !trimmed || busy) return;
    busy = true;
    error = null;
    try {
      const outcome = await createSharedVaultJoin().join(link, trimmed);
      if (outcome.kind === "failed") {
        error = outcome.message;
      } else if (outcome.kind === "owned") {
        ownedVaultId = outcome.vaultId;
      } else {
        link = null;
        notificationStore.notify(outcome.message, "success");
        await goto(resolve("/(app)"));
      }
    } finally {
      busy = false;
    }
  }

  async function openOwned() {
    if (!ownedVaultId) return;
    await vault.switchVault(ownedVaultId);
    await goto(resolve("/(app)"));
  }
</script>

<svelte:head>
  <title>Codex Cryptica | Join a shared vault</title>
</svelte:head>

<main
  class="mx-auto flex min-h-full w-full max-w-xl flex-col gap-4 bg-theme-bg p-4 font-body text-theme-text md:p-8"
>
  {#if !ready}
    <p class="text-sm text-theme-muted">Loading…</p>
  {:else if !link}
    <h1 class="font-header text-xl font-bold">This link does not work</h1>
    <p class="text-sm">
      This link is not complete. Ask the owner to send the group link again.
    </p>
    <a
      href={resolve("/(app)")}
      class="self-start border border-theme-border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:border-theme-primary/40"
    >
      Go to my vaults
    </a>
  {:else if ownedVaultId}
    <h1 class="font-header text-xl font-bold">Join a shared vault</h1>
    <p class="text-sm">You own this vault, and it is already on this device.</p>
    <button
      type="button"
      onclick={openOwned}
      class="self-start bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90"
    >
      Open vault
    </button>
  {:else}
    <h1 class="font-header text-xl font-bold">Join a shared vault</h1>
    <p class="text-sm leading-relaxed">
      Someone in your group shared a vault with you. Joining copies the whole
      vault to this device and keeps it in sync with the group.
    </p>

    <div class="flex flex-col gap-3 text-sm leading-relaxed">
      <p>
        <strong>Who can see and change it:</strong> everyone with this link (the owner
        and every group member) can read and change the whole vault, hidden and GM-only
        notes included.
      </p>
      <p>
        <strong>What gets stored:</strong> the shared copy holds the vault's entities,
        notes, labels, connections, images, maps and canvases, and your changes are
        uploaded to it.
      </p>
      <p>
        <strong>Where:</strong> Cloudflare R2, Codex Cryptica's hosting provider.
        The copy is not end-to-end encrypted, so the provider can technically read
        it. It is never sold, forwarded or used to train AI.
      </p>
      <p>
        <strong>What we can see:</strong> support sees only backup metadata (vault
        title, size, entry count, last backup time), not contents.
      </p>
      <p>
        <strong>Your copy stays yours:</strong> the vault on this device keeps working
        offline and stays yours if the link stops working.
      </p>
      <p>
        <strong>Stopping:</strong> you can stop syncing in Settings → Vault → Cloud
        Backup. Only the owner can turn sharing off or delete the shared copy.
      </p>
      <p>
        <strong>Your name:</strong> it is not checked, and it appears in the titles
        of conflict copies the group can see.
      </p>
    </div>

    <label class="flex flex-col gap-1 text-xs">
      Your name
      <input
        bind:value={name}
        maxlength="40"
        required
        autocomplete="nickname"
        class="border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
      />
    </label>
    {#if !trimmed}
      <p class="text-xs text-theme-muted">
        Type a name so the group can see who made a change.
      </p>
    {/if}

    {#if error}
      <p class="text-sm text-red-400" role="alert">{error}</p>
    {/if}

    <div class="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onclick={() => goto(resolve("/(app)"))}
        disabled={busy}
        class="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:text-theme-primary disabled:opacity-50"
      >
        Not now
      </button>
      <button
        type="button"
        onclick={join}
        disabled={busy || !trimmed}
        class="bg-theme-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
      >
        {busy ? "Copying the vault…" : "I understand and join"}
      </button>
    </div>
  {/if}
</main>
