<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { ScenarioState } from "@codex/adventure-engine";
  let {
    manager,
    vaultId,
    title = $bindable(""),
    premise = $bindable(""),
    characterName = $bindable(""),
    characterDescription = $bindable(""),
    characters = [],
    scenarioSeed,
    onScenarioStarted,
    onCancelScenario,
  }: {
    manager: AdventureManager;
    vaultId: string;
    title?: string;
    premise?: string;
    characterName?: string;
    characterDescription?: string;
    characters?: Array<{ id: string; name: string }>;
    scenarioSeed?: ScenarioState;
    onScenarioStarted?: () => void;
    onCancelScenario?: () => void;
  } = $props();
  let selectedCharacterId = $state("");
  let interacted = $state(false);
  let submitting = $state(false);
  let startError = $state<string | null>(null);

  function startInput(): Parameters<AdventureManager["start"]>[0] | null {
    if (!title.trim() || !premise.trim()) return null;
    const canonical = characters.find(
      (character) => character.id === selectedCharacterId,
    );
    if (!canonical && !characterName.trim()) return null;
    return {
      vaultId,
      title,
      premise,
      playerCharacter: canonical
        ? { kind: "canonical", name: canonical.name, recordId: canonical.id }
        : {
            kind: "provisional",
            name: characterName,
            description: characterDescription || characterName,
          },
      ...(scenarioSeed ? { scenarioSeed } : {}),
    };
  }

  function clearStartedDraft() {
    if (scenarioSeed) onScenarioStarted?.();
    title = "";
    premise = "";
    characterName = "";
    characterDescription = "";
    interacted = false;
  }

  function describeStartFailure(cause: unknown): string {
    return cause instanceof Error && cause.message === "active-adventure-exists"
      ? "An adventure is already active in this Vault. Continue or archive it before starting another."
      : "Could not start this adventure. Your choices are preserved.";
  }

  async function submit() {
    if (submitting) return;
    interacted = true;
    startError = null;
    const input = startInput();
    if (!input) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      startError = "Connect to the internet to start with Oracle.";
      return;
    }
    submitting = true;
    try {
      await manager.start(input);
      // An opening failure is reported in errorMessage without rejecting.
      if (!manager.errorMessage) clearStartedDraft();
    } catch (cause) {
      startError = describeStartFailure(cause);
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
    <h2 class="text-lg font-semibold text-theme-text">
      {scenarioSeed ? "Play a rumour with Oracle" : "Start an adventure"}
    </h2>
    <p class="mt-1 text-sm text-theme-text">
      Oracle will act as GM and use your campaign as grounding.
    </p>
  </div>
  {#if scenarioSeed}
    <div
      class="rounded-md border border-theme-border bg-theme-surface p-3"
      data-testid="selected-rumour-preview"
    >
      <p class="text-sm font-semibold text-theme-text">Selected rumour</p>
      <p class="mt-1 text-sm text-theme-text">
        {scenarioSeed.playerVisible.rumour}
      </p>
      <p class="mt-1 text-xs text-theme-text">
        Lead: {scenarioSeed.playerVisible.lead}
      </p>
    </div>
  {/if}
  <label class="block text-sm text-theme-text"
    >Adventure title
    <input
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
      bind:value={title}
      aria-invalid={interacted && !title.trim()}
      required
    />
  </label>
  <label class="block text-sm text-theme-text"
    >Premise
    <textarea
      class="mt-1 min-h-24 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
      bind:value={premise}
      aria-invalid={interacted && !premise.trim()}
      required
    ></textarea>
  </label>
  {#if characters.length > 0}
    <label class="block text-sm text-theme-text">
      Choose a Vault character (optional)
      <select
        bind:value={selectedCharacterId}
        onchange={() => {
          const selected = characters.find(
            (character) => character.id === selectedCharacterId,
          );
          if (selected) characterName = selected.name;
        }}
        class="mt-1 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
        data-testid="adventure-character-picker"
      >
        <option value="">New / provisional character</option>
        {#each characters as character (character.id)}
          <option value={character.id}>{character.name}</option>
        {/each}
      </select>
    </label>
  {/if}
  <label class="block text-sm text-theme-text"
    >Player character
    <input
      class="mt-1 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
      bind:value={characterName}
      aria-invalid={interacted && !characterName.trim() && !selectedCharacterId}
      required={!selectedCharacterId}
    />
  </label>
  <label class="block text-sm text-theme-text"
    >Character description (optional)
    <textarea
      class="mt-1 min-h-20 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
      bind:value={characterDescription}
    ></textarea>
  </label>
  <p class="text-xs text-theme-text">
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
  {#if scenarioSeed && onCancelScenario}
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text"
      onclick={onCancelScenario}
      data-testid="cancel-rumour-start"
    >
      Cancel selected rumour
    </button>
  {/if}
  {#if startError || manager.errorMessage}
    <p class="text-sm text-theme-danger" role="alert">
      {startError ?? manager.errorMessage}
    </p>
  {/if}
</form>
