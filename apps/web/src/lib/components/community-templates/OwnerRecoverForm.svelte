<script lang="ts">
  import type { EntityTemplate } from "entity-template-engine";

  let {
    busy,
    choose,
    none,
    token = $bindable(""),
    onRecover,
    onPick,
    onInstallCopy,
  }: {
    busy: boolean;
    /** Several local templates match: the user picks one. */
    choose: EntityTemplate[] | null;
    /** No local template matches: offer to add one. */
    none: boolean;
    token: string;
    onRecover: () => void;
    onPick: (templateId: string) => void;
    onInstallCopy: () => void;
  } = $props();

  const button =
    "rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:border-theme-primary disabled:opacity-50";
</script>

<h2 class="text-sm font-bold text-theme-text">Recover owner controls</h2>
{#if choose}
  <p class="text-xs text-theme-muted">
    More than one of your templates matches. Which one is this listing for?
  </p>
  <ul class="space-y-1">
    {#each choose as candidate (candidate.id)}
      <li>
        <button
          type="button"
          class={button}
          disabled={busy}
          onclick={() => onPick(candidate.id)}>{candidate.name}</button
        >
      </li>
    {/each}
  </ul>
{:else if none}
  <p class="text-xs text-theme-muted">
    None of your templates matches this listing. You can add its text to your
    vault as a new template and link it.
  </p>
  <button type="button" class={button} disabled={busy} onclick={onInstallCopy}
    >Add it to my templates</button
  >
{:else}
  <p class="text-xs text-theme-muted">
    If you published this template, enter the owner token you saved.
  </p>
  <div class="flex gap-2">
    <label class="sr-only" for="owner-token-input">Owner token</label>
    <input
      id="owner-token-input"
      bind:value={token}
      class="min-w-0 flex-1 rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
    />
    <button
      type="button"
      class={button}
      disabled={busy || !token.trim()}
      onclick={onRecover}>Recover</button
    >
  </div>
{/if}
