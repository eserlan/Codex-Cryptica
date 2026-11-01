<script lang="ts">
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { calendarStore } from "#lib/stores/calendar.svelte.js";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventureFocusPlay from "./AdventureFocusPlay.svelte";
  import { adventureContextService } from "#lib/services/adventure/adventure-context-service.js";
  import { adventureSessionRepository } from "#lib/services/adventure/adventure-session-repository.js";
  import { createAdventureEntityDraft } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { rumourAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
  import { characterChoices } from "#lib/services/solo-characters.js";

  let vaultId = $derived(oracle.vault.activeVaultId ?? "default");
  const selectedRumour = $derived(rumourAdventureHandoff.forVault(vaultId));
  const characters = $derived(characterChoices(oracle.vault.entities));
  let previouslyPrefilledScenario = $state<string | null>(null);
  let archivingForRumour = $state(false);
  let sessionConflictError = $state<string | null>(null);
  let restoringActiveAdventure = $state(true);
  let activeRestoreRequest = 0;

  // Held here, not in AdventureStart, because a failed start briefly creates
  // then archives a session (manager.session flips non-null then back to
  // null), which unmounts and remounts AdventureStart. This component never
  // unmounts, so the draft survives that round-trip instead of being lost.
  let startTitle = $state("");
  let startPremise = $state("");
  let startCharacterName = $state("");
  let startCharacterDescription = $state("");
  $effect(() => {
    if (!selectedRumour) {
      previouslyPrefilledScenario = null;
      return;
    }
    if (previouslyPrefilledScenario === selectedRumour.scenario.id) return;
    previouslyPrefilledScenario = selectedRumour.scenario.id;
    startTitle =
      "Rumour " +
      selectedRumour.selected.index +
      ": " +
      selectedRumour.selected.playerVisible.lead;
    startPremise = selectedRumour.selected.playerVisible.rumour;
  });

  async function archiveCurrentForRumour(): Promise<void> {
    if (archivingForRumour || oracle.adventure.readOnly) return;
    archivingForRumour = true;
    sessionConflictError = null;
    try {
      await oracle.adventure.end();
      await oracle.adventure.close();
    } catch {
      sessionConflictError =
        "The current adventure could not be archived. It has not been replaced.";
    } finally {
      archivingForRumour = false;
    }
  }

  function cancelRumour(): void {
    rumourAdventureHandoff.clear();
    startTitle = "";
    startPremise = "";
  }

  let existingEntityTitles = $derived(
    oracle.vault.allEntities.map((entity) => entity.title),
  );
  adventureSessionRepository.setRootResolver(async (id) => {
    const handle = await oracle.vault.getSpecificVaultHandle(id);
    if (!handle) throw new Error("vault-not-open");
    return handle;
  });
  adventureContextService.setResolver({
    async getWorldSnapshot(id) {
      if (oracle.vault.activeVaultId !== id) {
        throw new Error("vault-not-open");
      }
      return {
        entities: oracle.vault.allEntities,
        calendar: calendarStore.getSnapshot().config,
      };
    },
    async getById(vaultId, recordId) {
      if (oracle.vault.activeVaultId !== vaultId) return null;
      await oracle.vault.loadEntityContent(recordId);
      const entity = oracle.vault.entities[recordId];
      if (!entity) return null;
      return {
        id: entity.id,
        title: entity.title,
        type: entity.type,
        text: entity.content,
        lore: entity.lore || undefined,
      };
    },
    async search(vaultId, query, limit) {
      if (oracle.vault.activeVaultId !== vaultId || !query.trim()) return [];
      const services = await oracle.vault.serviceRegistry.ensureInitialized();
      const matches = await services.search.search(query, { limit });
      const records = await Promise.all(
        matches.map(async (match) => {
          await oracle.vault.loadEntityContent(match.id);
          const entity = oracle.vault.entities[match.id];
          if (!entity) return null;
          return {
            id: entity.id,
            title: entity.title,
            type: entity.type,
            text: entity.content,
            lore: entity.lore || undefined,
          };
        }),
      );
      return records.filter((record): record is NonNullable<typeof record> =>
        Boolean(record?.text.trim()),
      );
    },
  });

  async function addProvisionalFact(fact: ProvisionalFact): Promise<void> {
    const session = oracle.adventure.session;
    if (!session) throw new Error("No active adventure.");
    const draft = createAdventureEntityDraft(fact, session.title);
    if (!draft) throw new Error("This discovery is not available to save.");
    const existing = oracle.vault.allEntities.find(
      (entity) =>
        entity.title.trim().toLocaleLowerCase() ===
        draft.title.toLocaleLowerCase(),
    );
    if (existing) {
      notificationStore.notify(`${draft.title} is already in Codex.`, "info");
      return;
    }
    await oracle.vault.createEntity(draft.type, draft.title, draft.initialData);
    notificationStore.notify(`Added ${draft.title} to Codex.`, "success");
  }

  $effect(() => {
    const currentVaultId = vaultId;
    const request = ++activeRestoreRequest;
    restoringActiveAdventure = true;
    void oracle.adventure
      .openActive(currentVaultId)
      .catch((error) => {
        notificationStore.notify(
          error instanceof Error
            ? `Unable to open active adventure: ${error.message}`
            : "Unable to open the active adventure.",
          "error",
        );
      })
      .finally(() => {
        if (request === activeRestoreRequest) restoringActiveAdventure = false;
      });
  });
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
  {#if restoringActiveAdventure}
    <div
      class="flex items-center gap-2 rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
      ></span>
      Checking for an active adventure…
    </div>
  {:else if oracle.adventure.session}
    {#if selectedRumour}
      <section
        class="rounded-md border border-theme-border bg-theme-surface p-3"
        data-testid="existing-adventure-rumour-choice"
      >
        <h3 class="text-sm font-semibold text-theme-text">
          An adventure is already active
        </h3>
        <p class="mt-1 text-xs text-theme-text">
          Keep playing your current adventure, or explicitly archive it before
          beginning the selected rumour. Nothing will be replaced automatically.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text"
            onclick={() => rumourAdventureHandoff.clear()}
            >Continue current adventure</button
          >
          <button
            type="button"
            class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text disabled:opacity-50"
            disabled={archivingForRumour || oracle.adventure.readOnly}
            onclick={() => void archiveCurrentForRumour()}
            data-testid="archive-active-for-rumour"
            >{archivingForRumour
              ? "Archiving…"
              : "Archive and start rumour"}</button
          >
        </div>
        {#if oracle.adventure.readOnly}
          <p class="mt-2 text-xs text-theme-text">
            This tab is read-only. Switch to the controlling tab before
            archiving.
          </p>
        {/if}
        {#if sessionConflictError}
          <p role="alert" class="mt-2 text-xs text-theme-danger">
            {sessionConflictError}
          </p>
        {/if}
      </section>
    {/if}
    {#key oracle.adventure.session.id}
      <AdventureFocusPlay
        manager={oracle.adventure}
        existingTitles={existingEntityTitles}
        onAddProvisionalFact={addProvisionalFact}
        repository={adventureSessionRepository}
        {vaultId}
        onResume={(sessionId) => oracle.adventure.open(vaultId, sessionId)}
        onResumeArchived={async (sessionId) => {
          await oracle.adventure.resumeArchived(vaultId, sessionId);
        }}
      />
    {/key}
  {:else}
    <AdventureStart
      manager={oracle.adventure}
      {vaultId}
      bind:title={startTitle}
      bind:premise={startPremise}
      bind:characterName={startCharacterName}
      bind:characterDescription={startCharacterDescription}
      {characters}
      scenarioSeed={selectedRumour?.scenario}
      onScenarioStarted={() => rumourAdventureHandoff.clear()}
      onCancelScenario={cancelRumour}
    />
    <AdventureArchive
      repository={adventureSessionRepository}
      {vaultId}
      onResume={(sessionId) => oracle.adventure.open(vaultId, sessionId)}
      onResumeArchived={async (sessionId) => {
        await oracle.adventure.resumeArchived(vaultId, sessionId);
      }}
    />
  {/if}
</div>
