<script lang="ts">
  import {
    hasCommittedOpening,
    type AdventureManager,
  } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import {
    describeAdventureStartFailure,
    describeStartOutcome,
    startPrecheck,
  } from "#lib/services/adventure/adventure-start-failure.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
  import type { ScenarioState } from "@codex/adventure-engine";
  let {
    manager,
    vaultId,
    title = $bindable(""),
    premise = $bindable(""),
    characterName = $bindable(""),
    characterDescription = $bindable(""),
    selectedCharacterId = $bindable(""),
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
    selectedCharacterId?: string;
    characters?: Array<{ id: string; name: string }>;
    scenarioSeed?: ScenarioState;
    onScenarioStarted?: () => void;
    onCancelScenario?: () => void;
  } = $props();
  let interacted = $state(false);
  let submitting = $state(false);
  let startError = $state<string | null>(null);
  const shownError = $derived(
    startError ??
      (manager.errorCause
        ? describeAdventureStartFailure(manager.errorCause)
        : null),
  );

  const isManualSeed = $derived(scenarioSeed?.origin?.kind === "manual");
  const headingText = $derived(
    scenarioSeed
      ? isManualSeed
        ? "Play ready-made adventure with Oracle"
        : "Play a rumour with Oracle"
      : "Start an adventure",
  );
  const seedPreviewTitle = $derived(
    isManualSeed ? "Prepared adventure seed" : "Selected rumour",
  );
  const seedLeadLabel = $derived(isManualSeed ? "Objective: " : "Lead: ");
  const cancelLabel = $derived(
    isManualSeed ? "Cancel prepared adventure" : "Cancel selected rumour",
  );

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
      // The source list records explicit anchor provenance, so a
      // chosen Vault character must be listed to reach Oracle as canonical text.
      ...(canonical
        ? {
            sourceRecords: [
              {
                recordId: canonical.id,
                recordType: "character",
                displayName: canonical.name,
                role: "player-character" as const,
                availability: "available" as const,
              },
            ],
          }
        : {}),
      ...(scenarioSeed ? { scenarioSeed } : {}),
    };
  }

  function clearStartedDraft() {
    if (scenarioSeed) onScenarioStarted?.();
    title = "";
    premise = "";
    characterName = "";
    characterDescription = "";
    selectedCharacterId = "";
    interacted = false;
  }

  function describeStartFailure(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "invalid-adventure-setup")
      return "Some details are too long or invalid. Shorten them and retry. Your choices are preserved.";
    return "Could not start this adventure. Your choices are preserved.";
  }

  async function submit() {
    if (submitting || manager.starting) return;
    interacted = true;
    startError = null;
    const input = startInput();
    if (!input) return;
    // Rechecked here: the policy can change after a rumour was selected.
    startError = startPrecheck({
      aiDisabled: discoveryPolicyStore.aiDisabled,
      online: typeof navigator === "undefined" || navigator.onLine,
    });
    if (startError) return;
    submitting = true;
    try {
      await manager.start(input);
      startError = describeStartOutcome({
        errorCause: manager.errorCause,
        committed: hasCommittedOpening(manager.session),
        readOnly: manager.readOnly,
      });
      if (!startError) clearStartedDraft();
    } catch (cause) {
      startError = describeStartFailure(cause);
    } finally {
      submitting = false;
    }
  }
</script>

<!-- fallow-ignore-next-line complexity -->
<form
  class="space-y-4 rounded-xl border border-theme-border bg-theme-surface p-5"
  onsubmit={(event) => {
    event.preventDefault();
    void submit();
  }}
>
  <div>
    <h2 class="text-lg font-semibold text-theme-text">
      {headingText}
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
      <p class="text-sm font-semibold text-theme-text">
        {seedPreviewTitle}
      </p>
      <p class="mt-1 text-sm text-theme-text">
        {scenarioSeed.playerVisible.rumour}
      </p>
      <p class="mt-1 text-xs text-theme-text">
        {seedLeadLabel}{scenarioSeed.playerVisible.lead}
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
      oninput={() => (selectedCharacterId = "")}
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
      {cancelLabel}
    </button>
  {/if}
  {#if shownError}
    <p class="text-sm text-theme-danger" role="alert">{shownError}</p>
  {/if}
</form>
