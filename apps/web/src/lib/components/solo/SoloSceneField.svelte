<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";

  let draft = $state(soloSessionStore.session?.sceneName ?? "");
  const current = $derived(soloSessionStore.session?.sceneName ?? "");
  const hasScene = $derived(current.length > 0);

  // Keep the draft in step with the saved name, e.g. after a reload.
  $effect(() => {
    draft = current;
  });

  function confirm() {
    const name = draft.trim();
    if (!name) return;
    if (hasScene) {
      void soloSessionStore.renameScene(name);
    } else {
      void soloSessionStore.setScene(name);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm();
    } else if (event.key === "Escape") {
      draft = current;
    }
  }
</script>

<div class="flex min-w-0 items-center gap-1.5">
  <input
    type="text"
    class="min-w-0 w-40 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-sm text-theme-text"
    placeholder="Name this scene"
    aria-label="Current scene"
    data-testid="solo-scene"
    bind:value={draft}
    onkeydown={onKeydown}
  />
  {#if hasScene}
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
      data-testid="solo-scene-rename"
      onclick={confirm}
    >
      Rename
    </button>
  {:else}
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
      data-testid="solo-scene-new"
      onclick={confirm}
    >
      New scene
    </button>
  {/if}
</div>
