<script lang="ts">
  import { base } from "$app/paths";
  import SoloSetupDialog from "./SoloSetupDialog.svelte";
  import {
    soloPlayGuard,
    soloSessionStore,
  } from "$lib/stores/solo-session-instance";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { characterChoices } from "$lib/services/solo-characters";

  let setupOpen = $state(false);

  const isGuest = $derived(sessionModeStore.isGuestMode || vault.isGuest);
  const blockedReason = $derived(soloPlayGuard.soloStartBlockedReason());
  const maps = $derived(
    Object.values(vault.maps ?? {}).map((m) => ({ id: m.id, name: m.name })),
  );
  const journalState = $derived(sessionJournalStore.controlState);
  const characters = $derived(characterChoices(vault.entities));
</script>

<svelte:head>
  <title>Play | Codex Cryptica</title>
  <meta
    name="description"
    content="Start a solo session, or let the Oracle run an adventure."
  />
</svelte:head>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-8">
  <header>
    <h1 class="font-header text-xl tracking-widest text-theme-text uppercase">
      Play
    </h1>
    <p class="mt-1 text-sm text-theme-muted">
      Play this campaign on your own, or hand the game to the Oracle.
    </p>
  </header>

  {#if isGuest}
    <p
      class="rounded-lg border border-theme-border p-4 text-sm text-theme-muted"
    >
      Solo sessions are not available in guest mode.
    </p>
  {:else}
    <section class="rounded-lg border border-theme-border bg-theme-surface p-4">
      {#if soloSessionStore.isActive}
        <h2 class="font-header text-base text-theme-text">
          Your solo session is running
        </h2>
        <button
          type="button"
          class="mt-3 rounded-md border border-theme-primary/60 px-4 py-2 text-sm font-bold text-theme-primary hover:bg-theme-primary/10"
          data-testid="play-resume-solo"
          data-help-target="play-start-solo-session"
          onclick={() => soloSessionStore.resume()}
        >
          Resume Solo Session
        </button>
      {:else}
        <h2 class="font-header text-base text-theme-text">Play on your own</h2>
        <p class="mt-1 text-sm text-theme-muted">
          Pick a map, and the solo bar keeps your dice, Oracle, journal and
          notes close at hand. No AI is needed.
        </p>
        <button
          type="button"
          class="mt-3 rounded-md border border-theme-primary/60 px-4 py-2 text-sm font-bold text-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
          data-testid="play-start-solo"
          data-help-target="play-start-solo-session"
          disabled={!!blockedReason}
          onclick={() => (setupOpen = true)}
        >
          Start Solo Session
        </button>
        {#if blockedReason}
          <p class="mt-2 text-sm text-theme-muted">{blockedReason}</p>
        {/if}
      {/if}
    </section>

    {#if !discoveryPolicyStore.aiDisabled}
      <a
        href="{base}/adventure"
        class="block rounded-lg border border-theme-border p-4 hover:border-theme-primary/60"
        data-testid="play-adventure-mode"
      >
        <span class="font-header text-base text-theme-text"
          >Let the Oracle run the game</span
        >
        <span class="mt-1 block text-sm text-theme-muted">
          Optional. Adventure Mode uses the Oracle as game master. Solo sessions
          do not need it.
        </span>
      </a>
    {/if}
  {/if}
</div>

{#if setupOpen}
  <SoloSetupDialog
    {maps}
    {characters}
    defaultMapId={soloSessionStore.defaultMapId()}
    {journalState}
    onclose={() => (setupOpen = false)}
  />
{/if}
