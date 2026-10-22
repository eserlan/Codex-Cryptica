<script lang="ts">
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";
  import BiomeCopyFallback from "./BiomeCopyFallback.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();

  const draft = $derived(store.draft);
  const prompt = $derived(store.illustrationPromptText());
  const kept = $derived(Boolean(draft?.profile.illustrationPrompt));
  const links = $derived(draft?.profile.referenceLinks ?? []);

  let linkUrl = $state("");
  let linkLabel = $state("");
  let linkError = $state<string | null>(null);

  function addLink() {
    const result = store.addReferenceLink(linkUrl, linkLabel);
    if (result === "ok") {
      linkUrl = "";
      linkLabel = "";
      linkError = null;
    } else if (result === "full") {
      linkError = "You can keep up to 10 links. Remove one to add another.";
    } else {
      linkError = "Links must start with https:// and be a full web address.";
    }
  }

  async function chooseFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    try {
      if (file) await store.attachImage(file);
    } finally {
      // Let someone choose the same file again after fixing a problem.
      input.value = "";
    }
  }
</script>

<fieldset class="flex flex-col gap-3 rounded-xl border border-theme-border p-4">
  <legend class="px-1 text-theme-text">Illustration prompt</legend>
  <p class="text-sm text-theme-muted">
    Copy this into the image tool of your choice. Nothing here makes a picture
    for you.
  </p>
  <label for="biome-prompt" class="sr-only">Illustration prompt</label>
  <textarea
    id="biome-prompt"
    readonly
    rows="4"
    value={prompt}
    class="w-full break-words rounded border border-theme-border bg-theme-surface px-2 py-1 text-sm text-theme-text"
    onfocus={(e) => e.currentTarget.select()}
  ></textarea>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
      onclick={() => store.copyPrompt()}>Copy prompt</button
    >
    {#if kept}
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
        onclick={() => store.dropPrompt()}>Remove saved prompt</button
      >
    {:else}
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
        onclick={() => store.keepPrompt()}>Keep prompt with this biome</button
      >
    {/if}
  </div>
  <BiomeCopyFallback {store} />
</fieldset>

<fieldset class="flex flex-col gap-3 rounded-xl border border-theme-border p-4">
  <legend class="px-1 text-theme-text">Your picture and links</legend>

  {#if store.attachedImageUrl}
    <figure class="m-0 flex flex-col gap-2">
      <img
        src={store.attachedImageUrl}
        alt="Your picture for {draft?.title || 'this biome'}"
        class="aspect-[16/10] w-full max-w-md rounded-lg border border-theme-border object-cover"
      />
      <figcaption class="text-xs text-theme-muted">
        Your own picture. It is stored in your vault.
      </figcaption>
    </figure>
    <button
      type="button"
      class="self-start rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
      onclick={() => store.removeImage()}>Remove picture</button
    >
  {/if}

  <div class="flex flex-col gap-1">
    <label for="biome-picture" class="text-sm text-theme-muted"
      >Add a picture</label
    >
    <input
      id="biome-picture"
      type="file"
      accept="image/*"
      disabled={!draft?.entityId}
      onchange={chooseFile}
      class="text-sm text-theme-text"
    />
    {#if !draft?.entityId}
      <p class="text-xs text-theme-muted">
        Save the biome first, then you can add a picture to it.
      </p>
    {/if}
    {#if store.attachError}
      <p role="alert" class="text-sm text-theme-danger">{store.attachError}</p>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <p class="text-sm text-theme-muted">
      Links to references you want to keep with this biome. They stay private:
      they are never included when a vault is shared or published.
    </p>
    {#if links.length > 0}
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {#each links as link, index (link.url)}
          <li class="flex items-center justify-between gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="min-w-0 break-all text-theme-primary hover:underline"
              >{link.label || link.url}</a
            >
            <button
              type="button"
              class="shrink-0 text-xs text-theme-muted hover:text-theme-danger"
              aria-label="Remove link: {link.label || link.url}"
              onclick={() => store.removeReferenceLink(index)}>Remove</button
            >
          </li>
        {/each}
      </ul>
    {/if}
    <div class="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
      <label class="flex flex-col gap-1 text-sm text-theme-muted">
        <span>Link address</span>
        <input
          type="url"
          bind:value={linkUrl}
          placeholder="https://"
          class="rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm text-theme-muted">
        <span>Link name</span>
        <input
          type="text"
          maxlength="200"
          bind:value={linkLabel}
          class="rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        />
      </label>
      <button
        type="button"
        class="self-end rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
        onclick={addLink}>Add link</button
      >
    </div>
    {#if linkError}
      <p role="alert" class="text-sm text-theme-danger">{linkError}</p>
    {/if}
  </div>
</fieldset>
