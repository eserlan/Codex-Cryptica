<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let {
    manager,
    vaultId,
    title = $bindable(""),
    premise = $bindable(""),
    characterName = $bindable(""),
    characterDescription = $bindable(""),
  }: {
    manager: AdventureManager;
    vaultId: string;
    title?: string;
    premise?: string;
    characterName?: string;
    characterDescription?: string;
  } = $props();
  let interacted = $state(false);
  let submitting = $state(false);

  async function submit() {
    interacted = true;
    if (!title.trim() || !premise.trim() || !characterName.trim()) return;
    submitting = true;
    try {
      await manager.start({
        vaultId,
        title,
        premise,
        playerCharacter: {
          kind: "provisional",
          name: characterName,
          description: characterDescription || characterName,
        },
      });
      // manager.start() resolves normally even when the opening generation
      // itself fails — generateOpening() catches its own errors internally
      // (archiving the incomplete session and setting errorMessage) rather
      // than rethrowing, so a resolved promise here is NOT the same as
      // success. Only clear the draft once errorMessage confirms nothing
      // went wrong; otherwise these bindable fields (which survive this
      // component being torn down and remounted when session flips
      // non-null then back to null) are left in place to retry.
      if (!manager.errorMessage) {
        title = "";
        premise = "";
        characterName = "";
        characterDescription = "";
        interacted = false;
      }
    } catch {
      // manager.errorMessage already carries the failure for display below;
      // the drafted fields are deliberately left in place to retry.
    } finally {
      submitting = false;
    }
  }
</script>

<form
  class="space-y-4 rounded-xl border border-theme-border bg-theme-surface p-5"
  onsubmit={(event) => {
    event.preventDefault();
    void submit();
  }}
>
  <div>
    <h2 class="text-lg font-semibold text-theme-primary">Start an adventure</h2>
    <p class="mt-1 text-sm text-theme-secondary">
      Oracle will act as GM and use your campaign as grounding.
    </p>
  </div>
  <label class="block text-sm text-theme-primary"
    >Adventure title
    <input
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
      bind:value={title}
      aria-invalid={interacted && !title.trim()}
      required
    />
  </label>
  <label class="block text-sm text-theme-primary"
    >Premise
    <textarea
      class="mt-1 min-h-24 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
      bind:value={premise}
      aria-invalid={interacted && !premise.trim()}
      required
    ></textarea>
  </label>
  <label class="block text-sm text-theme-primary"
    >Player character
    <input
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
      bind:value={characterName}
      aria-invalid={interacted && !characterName.trim()}
      required
    />
  </label>
  <label class="block text-sm text-theme-primary"
    >Character description (optional)
    <textarea
      class="mt-1 min-h-20 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
      bind:value={characterDescription}
    ></textarea>
  </label>
  <p class="text-xs text-theme-secondary">
    GM notes are hidden while you play, but they are not encrypted from the
    vault owner.
  </p>
  <button
    class="inline-flex min-h-12 items-center gap-2 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary disabled:opacity-50"
    type="submit"
    disabled={submitting}
  >
    <span class="icon-[lucide--sparkles] h-4 w-4" aria-hidden="true"
    ></span>{submitting ? "Starting…" : "Start adventure"}
  </button>
  {#if manager.errorMessage}<p class="text-sm text-theme-danger" role="alert">
      {manager.errorMessage}
    </p>{/if}
</form>
