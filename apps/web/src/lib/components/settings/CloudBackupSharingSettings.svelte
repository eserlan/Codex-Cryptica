<script lang="ts">
  /**
   * Owner controls for group sharing (shared vault slice 7).
   *
   * The link carries the editor token, so it lives only in this component's
   * state: shown once after turn on or replace, cleared when the component
   * unmounts or the vault changes, and never stored.
   */
  import { tick } from "svelte";
  import CloudBackupShareLink from "./CloudBackupShareLink.svelte";
  import CloudBackupSharingConsent from "./CloudBackupSharingConsent.svelte";

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
  let linkBlock = $state<{ focus: () => void } | null>(null);
  /** Result of this session's own action, until the prop catches up. */
  let override = $state<boolean | null>(null);

  const isOn = $derived(override ?? sharing !== null);
  const enabledDate = $derived(
    sharing ? new Date(sharing.enabledAt).toLocaleDateString() : null,
  );

  const intro = $derived(
    !isOn
      ? "Give a group one link to read and change this whole vault together."
      : `Sharing is on${enabledDate ? ` since ${enabledDate}` : ""}.`,
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
        linkBlock?.focus();
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
    <p class="mt-1">{intro}</p>

    {#if link}
      <CloudBackupShareLink
        bind:this={linkBlock}
        {link}
        {copied}
        {copyFailed}
        oncopy={copyLink}
      />
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
  <CloudBackupSharingConsent
    {busy}
    onaccept={accept}
    oncancel={() => (showConsent = false)}
  />
{/if}
