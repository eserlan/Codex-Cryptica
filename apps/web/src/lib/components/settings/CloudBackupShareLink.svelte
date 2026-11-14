<script lang="ts">
  /** The one-time group link, with copy feedback. Lives only as long as its owner keeps it. */
  let {
    link,
    copied,
    copyFailed,
    oncopy,
  }: {
    link: string;
    copied: boolean;
    copyFailed: boolean;
    oncopy: () => void;
  } = $props();

  let field = $state<HTMLInputElement | null>(null);

  export function focus() {
    field?.focus();
  }
</script>

<div class="mt-2 flex flex-col gap-2" role="status">
  <label class="text-xs" for="share-link-field">
    Copy this link now. It will not be shown again.
  </label>
  <input
    id="share-link-field"
    readonly
    bind:this={field}
    value={link}
    class="w-full border border-theme-border bg-theme-bg px-2 py-1 font-mono text-xs"
    onfocus={(event) => event.currentTarget.select()}
  />
  <button
    type="button"
    class="self-start border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-text transition-colors hover:text-theme-text disabled:opacity-50"
    onclick={oncopy}>Copy link</button
  >
  {#if copied}<p>Link copied.</p>{/if}
  {#if copyFailed}
    <p role="alert">
      Could not copy automatically. Select the link and copy it by hand.
    </p>
  {/if}
</div>
