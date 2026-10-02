<script lang="ts">
  import { installEntityTemplateFromListing } from "$lib/stores/entity-templates/entity-template-install";
  import type { InstallResult } from "$lib/stores/entity-templates/entity-template-install";
  import SharingHelpLink from "./SharingHelpLink.svelte";

  let {
    listingId,
    title,
    install = installEntityTemplateFromListing,
    onClose = () => {},
    onInstalled = () => {},
  }: {
    listingId: string;
    title: string;
    install?: (listingId: string, name?: string) => Promise<InstallResult>;
    onClose?: () => void;
    onInstalled?: () => void;
  } = $props();

  type Step = "confirm" | "working" | "needs-name" | "done" | "error";
  let step = $state<Step>("confirm");
  let name = $state("");
  let message = $state("");
  let notice = $state("");

  async function run(chosenName?: string) {
    if (step === "working") return;
    step = "working";
    message = "";
    const result = await install(listingId, chosenName);
    if (result.status === "installed") {
      notice = result.notice ?? "";
      step = "done";
      onInstalled();
    } else if (result.status === "needs-name") {
      name = result.suggestedName;
      step = "needs-name";
    } else {
      message = result.message;
      step = "error";
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="install-entity-template-title"
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="install-entity-template-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Install “{title}”
      </h2>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        aria-label="Close"
        onclick={onClose}><span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span></button
      >
    </div>

    {#if step === "confirm"}
      <p class="mt-3 text-sm text-theme-muted">
        This adds a copy to your vault as one of your own templates. It won't
        become your default and it won't change any notes you already have.
        <SharingHelpLink />
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
          onclick={onClose}>Cancel</button
        >
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={() => run()}>Install</button
        >
      </div>
    {:else if step === "working"}
      <p class="mt-4 text-sm text-theme-muted" role="status">Installing…</p>
    {:else if step === "needs-name"}
      <p class="mt-3 text-sm text-theme-muted">
        You already have a template with this name for the same type. Choose a
        different name for the copy.
      </p>
      <label class="mt-3 block text-sm text-theme-text" for="install-name"
        >Name for your copy</label
      >
      <input
        id="install-name"
        bind:value={name}
        class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
      />
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
          onclick={onClose}>Cancel</button
        >
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
          disabled={!name.trim()}
          onclick={() => run(name)}>Install with this name</button
        >
      </div>
    {:else if step === "done"}
      <p class="mt-3 text-sm text-theme-text" role="status">
        Installed. Find it under Settings → Templates → Entity templates.
      </p>
      {#if notice}<p class="mt-2 text-xs text-theme-muted">{notice}</p>{/if}
      <div class="mt-5 flex justify-end">
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={onClose}>Done</button
        >
      </div>
    {:else}
      <p class="mt-3 text-sm text-theme-text" role="alert">{message}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text"
          onclick={onClose}>Close</button
        >
        <button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          onclick={() => run()}>Try again</button
        >
      </div>
    {/if}
  </div>
</div>
