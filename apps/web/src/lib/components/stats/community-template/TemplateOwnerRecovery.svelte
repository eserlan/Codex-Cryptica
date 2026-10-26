<script lang="ts">
  let {
    listingId,
    token = "",
    onSave = () => {},
  } = $props<{
    listingId: string;
    token?: string;
    onSave?: (token: string) => void;
  }>();
  let value = $state("");
  let copied = $state(false);
  let lastToken = $state("");
  $effect(() => {
    if (lastToken === token) return;
    lastToken = token;
    value = token;
  });

  async function copyToken() {
    await navigator.clipboard?.writeText(value);
    copied = true;
  }
</script>

<section
  class="rounded-lg border border-theme-border bg-theme-surface p-4"
  data-listing-id={listingId}
>
  <h2 class="text-sm font-bold text-theme-text">Recover owner controls</h2>
  <p class="mt-1 text-xs text-theme-muted">
    Enter the owner token you saved when publishing this template.
  </p>
  <div class="mt-3 flex gap-2">
    <input
      aria-label="Owner token"
      bind:value
      class="min-w-0 flex-1 rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
    /><button
      type="button"
      class="rounded border border-theme-border px-3 py-2 text-xs"
      onclick={() => onSave(value)}>Save</button
    ><button
      type="button"
      class="rounded border border-theme-border px-3 py-2 text-xs"
      onclick={copyToken}
      disabled={!value}>{copied ? "Copied" : "Copy"}</button
    >
  </div>
</section>
