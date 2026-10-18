<script lang="ts">
  import { resolve } from "$app/paths";
  import { downloadText } from "$lib/utils/download";

  let {
    templateName,
    listingId,
    token,
    linkSaved,
    onClose,
  }: {
    templateName: string;
    listingId: string;
    token: string;
    linkSaved: boolean;
    onClose: () => void;
  } = $props();

  let copied = $state(false);

  async function copyToken() {
    await navigator.clipboard?.writeText(token);
    copied = true;
  }

  function saveToken() {
    downloadText(
      `Owner token for "${templateName}"\nListing: ${listingId}\nToken: ${token}\n`,
      "template-owner-token.txt",
      "text/plain",
    );
  }
</script>

<div class="space-y-3" role="status">
  <p class="text-sm text-theme-text">
    Published. Anyone can now find and install this template.
  </p>
  <div class="rounded border border-theme-border bg-theme-bg p-3">
    <p class="text-xs font-bold text-theme-text">Your owner token</p>
    <p class="mt-1 text-xs text-theme-muted">
      Keep it somewhere safe. You need it to update or remove the listing if you
      clear this browser's data. It's shown only once.
    </p>
    <code
      class="mt-2 block break-all rounded bg-theme-surface p-2 text-xs text-theme-text"
      data-testid="owner-token">{token}</code
    >
    <div class="mt-2 flex gap-2">
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-xs text-theme-text"
        onclick={copyToken}>{copied ? "Copied" : "Copy"}</button
      >
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-xs text-theme-text"
        onclick={saveToken}>Save as file</button
      >
    </div>
    {#if !linkSaved}
      <p class="mt-2 text-xs text-theme-muted" role="alert">
        This device couldn't remember the listing. Save the token now, and use
        "Recover owner controls" on the listing page later.
      </p>
    {/if}
  </div>
  <div class="flex justify-end gap-2">
    <a
      class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
      href={resolve(`/templates/entity/${listingId}` as any)}>View listing</a
    >
    <button
      type="button"
      class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
      onclick={onClose}>Done</button
    >
  </div>
</div>
