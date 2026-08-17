<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  let expanded = $state(false);
  let location = $state("");
  let situation = $state("");
  let submitting = $state(false);
  let error = $state<string | null>(null);

  function openForm() {
    location = manager.session?.visibleState.location?.text ?? "";
    situation = manager.session?.visibleState.situation?.text ?? "";
    error = null;
    expanded = true;
  }

  function closeForm() {
    expanded = false;
    error = null;
  }

  const emptyCollectionPatch = {
    add: [],
    update: [],
    removeIds: [],
  };

  async function submit() {
    if (!manager.session) return;
    submitting = true;
    error = null;
    try {
      const current = manager.session.visibleState;
      const patch = {
        objectives: emptyCollectionPatch,
        activeCharacters: emptyCollectionPatch,
        knownFacts: emptyCollectionPatch,
        relationships: emptyCollectionPatch,
      } as Parameters<AdventureManager["submitCorrection"]>[0];

      const trimmedLocation = location.trim();
      if (trimmedLocation !== (current.location?.text ?? "")) {
        patch.location = trimmedLocation
          ? {
              id: current.location?.id ?? crypto.randomUUID(),
              text: trimmedLocation,
              source: "provisional",
            }
          : null;
      }

      const trimmedSituation = situation.trim();
      if (trimmedSituation !== (current.situation?.text ?? "")) {
        patch.situation = trimmedSituation
          ? {
              id: current.situation?.id ?? crypto.randomUUID(),
              text: trimmedSituation,
              source: "provisional",
            }
          : null;
      }

      if (patch.location === undefined && patch.situation === undefined) {
        closeForm();
        return;
      }

      const outcome = await manager.submitCorrection(patch);
      if (outcome === "stale-revision") {
        error =
          "The session changed since you opened this form. Review the current situation and try again.";
        return;
      }
      notificationStore.notify("Correction saved.", "success");
      closeForm();
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Unable to save the correction.";
    } finally {
      submitting = false;
    }
  }
</script>

{#if manager.session && !manager.readOnly}
  <section class="rounded-lg border border-theme-border p-4">
    {#if !expanded}
      <button
        type="button"
        class="text-sm font-medium text-theme-primary underline"
        onclick={openForm}
      >
        Fix something wrong with the current situation
      </button>
    {:else}
      <h3 class="font-semibold text-theme-primary">Correct the situation</h3>
      <p class="mt-1 text-xs text-theme-secondary">
        Only what the player currently knows can be corrected here — this never
        touches anything the GM is keeping hidden.
      </p>
      <div class="mt-3 space-y-3">
        <label class="block text-sm">
          <span class="text-theme-secondary">Location</span>
          <input
            type="text"
            bind:value={location}
            class="mt-1 min-h-12 w-full rounded-md border border-theme-border bg-theme-surface px-3 text-theme-primary"
          />
        </label>
        <label class="block text-sm">
          <span class="text-theme-secondary">Situation</span>
          <input
            type="text"
            bind:value={situation}
            class="mt-1 min-h-12 w-full rounded-md border border-theme-border bg-theme-surface px-3 text-theme-primary"
          />
        </label>
      </div>
      {#if error}<p class="mt-2 text-sm text-theme-danger" role="alert">
          {error}
        </p>{/if}
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="flex min-h-12 items-center justify-center rounded-md border border-theme-primary/50 px-3 text-sm text-theme-primary transition hover:bg-theme-primary/10 disabled:opacity-50"
          disabled={submitting}
          onclick={() => void submit()}
        >
          Save correction
        </button>
        <button
          type="button"
          class="flex min-h-12 items-center justify-center rounded-md border border-theme-border px-3 text-sm text-theme-secondary"
          onclick={closeForm}
        >
          Cancel
        </button>
      </div>
    {/if}
  </section>
{/if}
