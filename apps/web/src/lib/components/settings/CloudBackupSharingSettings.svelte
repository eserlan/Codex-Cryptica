<script lang="ts">
  /**
   * Owner controls for group sharing (shared vault slice 7).
   *
   * The link carries the editor token, so it lives only in this component's
   * state: shown once after turn on or replace, cleared when the component
   * unmounts or the vault changes, and never stored.
   */
  import { tick } from "svelte";
  import { focusTrap } from "#lib/actions/focusTrap.js";

  type Outcome = { ok: true; link?: string } | { ok: false; error: string };

  let {
    vaultId,
    backupOn,
    sharing,
    enable,
    replace,
    disable,
    confirm,
  }: {
    vaultId?: string;
    backupOn: boolean;
    sharing: { linkVersion: number; enabledAt: string } | null;
    enable: () => Promise<Outcome>;
    replace: () => Promise<Outcome>;
    disable: () => Promise<Outcome>;
    confirm: (options: {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      isDangerous?: boolean;
    }) => Promise<boolean>;
  } = $props();

  let showConsent = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let link = $state<string | null>(null);
  let copyFailed = $state(false);
  let copied = $state(false);
  let working = $state<string | null>(null);
  let linkField = $state<HTMLInputElement | null>(null);
  /** Result of this session's own action, until the prop catches up. */
  let override = $state<boolean | null>(null);

  const isOn = $derived(override ?? sharing !== null);
  const enabledDate = $derived(
    sharing ? new Date(sharing.enabledAt).toLocaleDateString() : null,
  );

  $effect(() => {
    void sharing;
    override = null;
  });

  $effect(() => {
    void vaultId;
    return () => {
      link = null;
      copyFailed = false;
      error = null;
      showConsent = false;
    };
  });

  async function run(
    action: () => Promise<Outcome>,
    turnsOn: boolean | null,
    label: string,
  ) {
    if (busy) return;
    busy = true;
    working = label;
    error = null;
    copyFailed = false;
    copied = false;
    try {
      const result = await action();
      if (!result.ok) {
        error = result.error;
        return;
      }
      link = turnsOn ? (result.link ?? null) : null;
      override = turnsOn;
      if (link) {
        await tick();
        linkField?.focus();
      }
    } catch {
      error = "Something went wrong. Please try again.";
    } finally {
      busy = false;
      working = null;
    }
  }

  async function accept() {
    showConsent = false;
    await run(enable, true, "Turning on sharing…");
  }

  async function replaceLink() {
    if (busy) return;
    const ok = await confirm({
      title: "Replace the group link?",
      message:
        "The old link stops working at once. Members must rejoin with the new link.",
      confirmLabel: "Replace link",
      cancelLabel: "Cancel",
      isDangerous: true,
    });
    if (ok) await run(replace, true, "Replacing the link…");
  }

  async function turnOff() {
    if (busy) return;
    const ok = await confirm({
      title: "Turn off sharing?",
      message:
        "The group link stops working. The backup itself stays intact. Members keep the copy they already have.",
      confirmLabel: "Turn off sharing",
      cancelLabel: "Cancel",
      isDangerous: true,
    });
    if (!ok) return;
    await run(disable, false, "Turning off sharing…");
  }

  async function copyLink() {
    if (!link) return;
    copyFailed = false;
    copied = false;
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch {
      copyFailed = true;
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && showConsent) showConsent = false;
  };

  const buttonClass =
    "border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-text transition-colors hover:text-theme-text disabled:opacity-50";
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="border-t border-theme-border pt-3 text-sm text-theme-text">
  <p class="font-semibold">Share with group</p>
  {#if !backupOn}
    <p class="mt-1">Turn Cloud Backup on first to share this vault.</p>
  {:else}
    {#if isOn}
      <p class="mt-1">
        Sharing is on{enabledDate ? ` since ${enabledDate}` : ""}.
      </p>
    {:else}
      <p class="mt-1">
        Give a group one link to read and change this whole vault together.
      </p>
    {/if}

    {#if link}
      <div class="mt-2 flex flex-col gap-2" role="status">
        <label class="text-xs" for="share-link-field">
          Copy this link now. It will not be shown again.
        </label>
        <input
          id="share-link-field"
          readonly
          bind:this={linkField}
          value={link}
          class="w-full border border-theme-border bg-theme-bg px-2 py-1 font-mono text-xs"
          onfocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          class="{buttonClass} self-start"
          onclick={copyLink}>Copy link</button
        >
        {#if copied}<p>Link copied.</p>{/if}
        {#if copyFailed}
          <p role="alert">
            Could not copy automatically. Select the link and copy it by hand.
          </p>
        {/if}
      </div>
    {/if}

    <div class="mt-2 flex flex-wrap gap-2">
      {#if isOn}
        <button
          type="button"
          class={buttonClass}
          disabled={busy}
          onclick={replaceLink}>Replace link</button
        >
        <button
          type="button"
          class={buttonClass}
          disabled={busy}
          onclick={turnOff}>Turn off sharing</button
        >
      {:else}
        <button
          type="button"
          class="bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
          disabled={busy}
          onclick={() => (showConsent = true)}>Share with group</button
        >
      {/if}
    </div>
  {/if}
  {#if working}<p class="mt-2" role="status">{working}</p>{/if}
  {#if error}<p class="mt-2 text-red-400" role="alert">{error}</p>{/if}
</div>

{#if showConsent}
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md"
      aria-label="Cancel sharing setup"
      onclick={() => (showConsent = false)}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-consent-title"
      tabindex="-1"
      use:focusTrap
      class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto border border-theme-border bg-theme-surface p-6"
    >
      <h2
        id="share-consent-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Before you share this vault
      </h2>
      <div
        class="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-theme-text"
      >
        <p>
          <strong>Who can see and change it:</strong> anyone with the link can read
          and change the whole vault, hidden and GM-only notes included.
        </p>
        <p>
          <strong>Syncing:</strong> changes the group makes sync automatically.
        </p>
        <p>
          <strong>Removing people:</strong> a removed member keeps their own copy
          of the vault.
        </p>
        <p>
          <strong>What gets stored:</strong> the shared copy holds the vault's entities,
          notes, labels, connections, images, maps and canvases.
        </p>
        <p>
          <strong>Where:</strong> the copy is stored by Codex Cryptica's hosting provider,
          Cloudflare R2. It is not end-to-end encrypted, so the provider can technically
          read it. It is never sold, forwarded or used to train AI.
        </p>
        <p>
          <strong>What we can see:</strong> Codex Cryptica support can see only backup
          metadata (vault title, size, entry count, last backup time), not the contents.
        </p>
        <p>
          <strong>Turning it off:</strong> you can turn sharing off here at any time,
          which stops the link. Deleting the backup permanently erases the remote
          copy; members' local vaults are not deleted.
        </p>
        <p>
          <strong>Who is in charge:</strong> only the owner's recovery key can replace
          the link, turn sharing off or delete the backup.
        </p>
      </div>
      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onclick={() => (showConsent = false)}
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-text"
        >
          Not now
        </button>
        <button
          type="button"
          onclick={accept}
          disabled={busy}
          class="bg-theme-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90 disabled:opacity-50"
        >
          I understand, share with group
        </button>
      </div>
    </div>
  </div>
{/if}
