<!-- fallow-ignore-file complexity -- Existing adventure entry and restoration view; only filtering of dismissed facts changed. -->
<script lang="ts">
  import { untrack } from "svelte";
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { calendarStore } from "#lib/stores/calendar.svelte.js";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventureEntryChoices from "./AdventureEntryChoices.svelte";
  import WorldEntrySetup from "./WorldEntrySetup.svelte";
  import WorldEntryContextPreview from "./WorldEntryContextPreview.svelte";
  import {
    emptyWorldEntrySetup,
    type WorldEntrySetup as WorldEntryDraft,
  } from "#lib/services/adventure/world-entry-setup.js";
  import {
    resolveWorldEntryPreview,
    type WorldEntryContextPreview as ContextPreview,
  } from "#lib/services/adventure/world-entry-context-preview.js";
  import {
    createWorldEntryStart,
    describeWorldEntryStartFailure,
  } from "#lib/services/adventure/world-entry-start.js";
  import AdventureFocusPlay from "./AdventureFocusPlay.svelte";
  import AdventureRumourConflict from "./AdventureRumourConflict.svelte";
  import type { ScenarioItem } from "@codex/adventure-engine";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
  import { createAdventureBackgroundRequest } from "#lib/services/adventure/adventure-background-request.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { createCampaignGeneratorService } from "#lib/components/generators/campaign-generator-service.js";
  import { adventureContextService } from "#lib/services/adventure/adventure-context-service.js";
  import { adventureSessionRepository } from "#lib/services/adventure/adventure-session-repository.js";
  import { configureAdventureRepository } from "#lib/services/adventure/configure-adventure-repository.js";
  import {
    batchFilterPromotableFacts,
    createAdventureEntityDraft,
    promoteProvisionalFacts,
    type FactPromotionDeps,
  } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import { adventurePromotionSettings } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import type { Entity } from "schema";
  import {
    describeStartOutcome,
    startPrecheck,
  } from "#lib/services/adventure/adventure-start-failure.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
  import { hasCommittedOpening } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { rumourAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
  import { characterChoices } from "#lib/services/solo-characters.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { isVaultReadyForGenerators } from "#lib/stores/vault/readiness.js";

  /** Metadata restored with the body; date-aware context decides on it. */
  function sourceMetadata(entity: Entity) {
    return {
      visibility: entity.visibility,
      start_date: entity.start_date,
      end_date: entity.end_date,
      date: entity.date,
    };
  }

  let vaultId = $derived(oracle.vault.activeVaultId ?? "default");
  const selectedRumour = $derived(rumourAdventureHandoff.forVault(vaultId));
  const characters = $derived(characterChoices(oracle.vault.entities));
  const locations = $derived(
    oracle.vault.allEntities
      .filter(
        (entity) =>
          entity.type === "location" && entity.visibility !== "hidden",
      )
      .map((entity) => ({ id: entity.id, name: entity.title })),
  );
  const canDiscover = $derived(
    isVaultReadyForGenerators(vault) && !vault.isGuest,
  );
  // The typed world-entry draft lives here so view transitions cannot erase it.
  let worldSetup = $state(emptyWorldEntrySetup("default"));
  let startApproach = $state<"choose" | "premise" | "world" | "preview">(
    "choose",
  );
  let worldPreview = $state<ContextPreview | null>(null);
  let worldStartBusy = $state(false);
  // Leaving a start form mid-start would remount it with a fresh local guard.
  const startInFlight = $derived(oracle.adventure.starting || worldStartBusy);
  let worldStartError = $state<string | null>(null);
  let previousVaultId: string | null = null;
  let previouslyPrefilledScenario = $state<string | null>(null);
  let archivingForRumour = $state(false);
  let sessionConflictError = $state<string | null>(null);
  let restoringActiveAdventure = $state(true);
  let activeRestoreRequest = 0;
  // Invalidated on Vault change so an old start cannot touch the new draft.
  let worldLaunchToken = 0;

  // Held here, not in AdventureStart, because a failed start briefly creates
  // then archives a session (manager.session flips non-null then back to
  // null), which unmounts and remounts AdventureStart. This component never
  // unmounts, so the draft survives that round-trip instead of being lost.
  let startTitle = $state("");
  let startPremise = $state("");
  let startCharacterId = $state("");
  let startCharacterName = $state("");
  let startCharacterDescription = $state("");

  // Never carry an unsaved character or premise draft between vaults.
  $effect(() => {
    const currentVaultId = vaultId;
    if (previousVaultId === null)
      worldSetup = emptyWorldEntrySetup(currentVaultId);
    if (previousVaultId !== null && previousVaultId !== currentVaultId) {
      startApproach = "choose";
      startTitle = "";
      startPremise = "";
      startCharacterName = "";
      startCharacterId = "";
      startCharacterDescription = "";
      worldSetup = emptyWorldEntrySetup(currentVaultId);
      worldPreview = null;
      worldStartBusy = false;
      worldStartError = null;
      worldLaunchToken += 1;
    }
    previousVaultId = currentVaultId;
  });

  function discoverAdventure(): void {
    if (!canDiscover) return;
    modalUIStore.openIntentGeneratorWorkflow("rumour");
  }

  $effect(() => {
    if (!selectedRumour) {
      previouslyPrefilledScenario = null;
      return;
    }
    if (previouslyPrefilledScenario === selectedRumour.scenario.id) return;
    previouslyPrefilledScenario = selectedRumour.scenario.id;
    const selected = selectedRumour.selected;
    if ("index" in selected) {
      startTitle =
        "Rumour " + selected.index + ": " + selected.playerVisible.lead;
      startPremise = selected.playerVisible.rumour;
    } else {
      startTitle =
        selectedRumour.adventureTitle ||
        selected.playerVisible.title ||
        "Adventure";
      startPremise = selectedRumour.scenario.playerVisible.rumour;
    }
  });

  function reviewWorldEntry(draft: WorldEntryDraft): void {
    worldSetup = draft;
    worldStartError = null;
    worldPreview = resolveWorldEntryPreview({
      entities: oracle.vault.allEntities,
      calendar: calendarStore.config,
      characterId: draft.characterId || undefined,
      locationId: draft.locationId || undefined,
      at: draft.at,
      maxRecords: 14,
    });
    startApproach = "preview";
  }

  async function startWorldEntry(): Promise<void> {
    if (worldStartBusy || oracle.adventure.starting) return;
    worldStartError = startPrecheck({
      aiDisabled: discoveryPolicyStore.aiDisabled,
      online: typeof navigator === "undefined" || navigator.onLine,
    });
    if (worldStartError) return;
    const token = ++worldLaunchToken;
    worldStartBusy = true;
    const message = await launchWorldEntry();
    // A Vault switch mid-start resets this surface; drop the stale result.
    if (token !== worldLaunchToken) return;
    worldStartBusy = false;
    worldStartError = message;
    if (message) return;
    worldSetup = emptyWorldEntrySetup(vaultId);
    worldPreview = null;
    startApproach = "choose";
  }

  /** Starts the adventure; returns copy to show, or null once it opened. */
  async function launchWorldEntry(): Promise<string | null> {
    let stage: "setup" | "launch" = "setup";
    try {
      // Deeply reactive $state drafts contain Proxies that structuredClone
      // cannot serialize. Snapshot before constructing the persisted session.
      const input = createWorldEntryStart(
        $state.snapshot(worldSetup),
        characters,
        locations,
        calendarStore.config,
      );
      stage = "launch";
      await oracle.adventure.start(input);
      return describeStartOutcome({
        errorCause: oracle.adventure.errorCause,
        committed: hasCommittedOpening(oracle.adventure.session),
        readOnly: oracle.adventure.readOnly,
      });
    } catch (cause) {
      return describeWorldEntryStartFailure(cause, stage);
    }
  }

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

  async function addRumourToCurrentAdventure(): Promise<void> {
    const pending = selectedRumour;
    if (!pending || !oracle.adventure.session || oracle.adventure.readOnly)
      return;
    sessionConflictError = null;
    const item: ScenarioItem = {
      ...structuredClone(pending.scenario),
      knowledge: "heard",
      anchorRefs: [],
      revealedSecretIds: [],
      secretBindings: {
        truth: crypto.randomUUID(),
        ifInvestigated: crypto.randomUUID(),
        eventIds: {},
      },
    };
    try {
      await oracle.adventure.addScenario(item);
      rumourAdventureHandoff.clear();
    } catch (cause) {
      sessionConflictError = `The rumour was not added. ${describeScenarioMutationError(cause)}`;
    }
  }

  function cancelRumour(): void {
    const generatorId =
      selectedRumour?.sourceGeneratorId === "adventure"
        ? "adventure"
        : "rumour";
    // Keep the source batch so the generator reopens on the same draft.
    const hasSourceBatch = rumourAdventureHandoff.cancel(vaultId);
    startApproach = "choose";
    startTitle = "";
    startPremise = "";
    if (hasSourceBatch) modalUIStore.openIntentGeneratorWorkflow(generatorId);
  }

  let existingEntityTitles = $derived(
    oracle.vault.allEntities.map((entity) => entity.title),
  );
  configureAdventureRepository(oracle.vault);
  // Standard AI/Vault-grounded Rumour Generator, without the player-facing
  // review modal or a Vault write. Its existing local fallback remains usable.
  const rumourPolicy = () => ({
    isEnabled: oracle.isEnabled,
    isAvailable: !vault.isGuest,
  });
  const backgroundRumourService = createCampaignGeneratorService(rumourPolicy);
  oracle.adventure.setWorldEntryRumourGenerator(
    async (session, signal, context) => {
      signal?.throwIfAborted();
      const policy = rumourPolicy();
      const request = createAdventureBackgroundRequest(
        session,
        context,
        policy.isEnabled && policy.isAvailable,
        themeStore.worldThemeId ?? "workspace",
      );
      const generated = await backgroundRumourService.generateDraft(
        request,
        signal,
      );
      if (!generated.content || !generated.lore)
        throw new Error("rumour-generator-output-missing");
      return {
        title: generated.title,
        content: generated.content,
        lore: generated.lore,
      };
    },
  );

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
      if (oracle.vault.activeVaultId !== vaultId)
        throw new Error("vault-not-open");
      await oracle.vault.loadEntityContent(recordId);
      if (oracle.vault.activeVaultId !== vaultId)
        throw new Error("vault-not-open");
      const entity = oracle.vault.entities[recordId];
      if (!entity) return null;
      return {
        id: entity.id,
        title: entity.title,
        type: entity.type,
        text: entity.content,
        lore: entity.lore || undefined,
        connections: entity.connections,
        ...sourceMetadata(entity),
      };
    },
    async search(vaultId, query, limit) {
      if (oracle.vault.activeVaultId !== vaultId)
        throw new Error("vault-not-open");
      if (!query.trim()) return [];
      const services = await oracle.vault.serviceRegistry.ensureInitialized();
      const matches = await services.search.search(query, { limit });
      if (oracle.vault.activeVaultId !== vaultId)
        throw new Error("vault-not-open");
      const records = await Promise.all(
        matches.map(async (match) => {
          await oracle.vault.loadEntityContent(match.id);
          if (oracle.vault.activeVaultId !== vaultId)
            throw new Error("vault-not-open");
          const entity = oracle.vault.entities[match.id];
          if (!entity) return null;
          return {
            id: entity.id,
            title: entity.title,
            type: entity.type,
            text: entity.content,
            lore: entity.lore || undefined,
            connections: entity.connections,
            ...sourceMetadata(entity),
          };
        }),
      );
      return records.filter((record): record is NonNullable<typeof record> =>
        Boolean(record?.text.trim()),
      );
    },
  });

  /** Best effort: a place the player saves (or finds already saved) is tied to its Vault record. */
  async function linkPlaceToRecord(
    fact: ProvisionalFact,
    recordId: string,
  ): Promise<void> {
    if (fact.kind !== "place") return;
    try {
      await oracle.adventure.linkPlaceRecord(fact.name, recordId);
    } catch {
      // The title match at the next turn links it instead.
    }
  }

  function promotionDeps(
    adventureId: string,
    vaultId: string | null | undefined,
  ): FactPromotionDeps {
    return {
      isCurrent: () =>
        oracle.adventure.session?.id === adventureId &&
        oracle.vault.activeVaultId === vaultId,
      findExistingId: (title) =>
        oracle.vault.allEntities.find(
          (entity) =>
            entity.title.trim().toLocaleLowerCase() ===
            title.trim().toLocaleLowerCase(),
        )?.id,
      createEntity: (type, title, data) =>
        oracle.vault.createEntity(type, title, data),
      linkRecord: linkPlaceToRecord,
    };
  }

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
      await linkPlaceToRecord(fact, existing.id);
      notificationStore.notify(`${draft.title} is already in Codex.`, "info");
      return;
    }
    const recordId = await oracle.vault.createEntity(
      draft.type,
      draft.title,
      draft.initialData,
    );
    await linkPlaceToRecord(fact, recordId);
    notificationStore.notify(`Added ${draft.title} to Codex.`, "success");
  }

  async function addAllProvisionalFacts(
    facts: ProvisionalFact[],
  ): Promise<void> {
    const session = oracle.adventure.session;
    if (!session) throw new Error("No active adventure.");
    const originatingVaultId = oracle.vault.activeVaultId;
    const { added: addedCount, interrupted } = await promoteProvisionalFacts(
      facts,
      session.title,
      promotionDeps(session.id, originatingVaultId),
    );
    if (interrupted) {
      throw new Error(
        "The active adventure changed. Add the remaining discoveries from that adventure.",
      );
    }
    if (addedCount > 0) {
      notificationStore.notify(
        `Added ${addedCount} ${addedCount === 1 ? "discovery" : "discoveries"} to Codex.`,
        "success",
      );
    }
  }

  let autoPromoting = false;
  const processedAutoPromoteFactIds = new Set<string>();

  $effect(() => {
    const session = oracle.adventure.session;
    if (
      !session ||
      !adventurePromotionSettings.autoPromote ||
      !oracle.vault.isInitialized
    ) {
      return;
    }
    const originatingVaultId = oracle.vault.activeVaultId;
    const facts = session.provisionalFacts ?? [];
    const pending = batchFilterPromotableFacts(facts, existingEntityTitles, [
      ...processedAutoPromoteFactIds,
      ...(session.dismissedProvisionalFactIds ?? []),
    ]);
    if (pending.length === 0 || autoPromoting) return;

    autoPromoting = true;
    void (async () => {
      try {
        const { added: addedCount } = await promoteProvisionalFacts(
          pending,
          session.title,
          {
            ...promotionDeps(session.id, originatingVaultId),
            onAttempt: (fact) => processedAutoPromoteFactIds.add(fact.id),
          },
        );
        if (addedCount > 0) {
          notificationStore.notify(
            `Auto-promoted ${addedCount} ${addedCount === 1 ? "discovery" : "discoveries"} to Codex.`,
            "success",
          );
        }
      } catch (err) {
        console.error("Auto-promote error:", err);
      } finally {
        autoPromoting = false;
      }
    })();
  });

  $effect(() => {
    const currentVaultId = vaultId;
    // On a reload the Vault's storage handle does not exist until it has
    // finished initialising; an earlier lookup reports "no adventures" and the
    // start screen would win. Wait, then this effect re-runs.
    const vaultReady = oracle.vault.isInitialized;
    const request = ++activeRestoreRequest;
    restoringActiveAdventure = true;
    if (!vaultReady) return;
    // untrack: openActive reads the live session. Tracking it would re-run this
    // effect when the player leaves an adventure and reopen it straight away.
    void untrack(() => oracle.adventure.openActive(currentVaultId))
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

<!-- fallow-ignore-next-line css-broken-reference -->
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
    {#if selectedRumour && !oracle.adventure.session.scenarioCollection?.items.some((item) => item.id === selectedRumour.scenario.id)}
      <AdventureRumourConflict
        kind={selectedRumour.sourceGeneratorId === "adventure"
          ? "adventure"
          : "rumour"}
        readOnly={oracle.adventure.readOnly}
        pendingRoll={!!oracle.adventure.session.pendingRoll}
        archiving={archivingForRumour}
        error={sessionConflictError}
        onAdd={() => void addRumourToCurrentAdventure()}
        onContinue={() => rumourAdventureHandoff.clear()}
        onCancel={cancelRumour}
        onArchive={() => void archiveCurrentForRumour()}
      />
    {/if}
    {#key oracle.adventure.session.id}
      <AdventureFocusPlay
        manager={oracle.adventure}
        existingTitles={existingEntityTitles}
        onAddProvisionalFact={addProvisionalFact}
        onAddAllProvisionalFacts={addAllProvisionalFacts}
        repository={adventureSessionRepository}
        {vaultId}
        onResume={(sessionId) => oracle.adventure.switchTo(vaultId, sessionId)}
        onResumeArchived={async (sessionId) => {
          await oracle.adventure.resumeArchived(vaultId, sessionId);
        }}
      />
    {/key}
  {:else}
    {#if !selectedRumour && startApproach === "choose"}
      <AdventureEntryChoices
        {canDiscover}
        onDiscover={discoverAdventure}
        onSurpriseMe={() =>
          modalUIStore.openIntentGeneratorWorkflow("adventure")}
        onOwnPremise={() => (startApproach = "premise")}
        onEnterWorld={() => (startApproach = "world")}
      />
    {:else}
      {#if !selectedRumour && startApproach === "world"}
        <button
          type="button"
          data-testid="world-entry-change-approach"
          class="min-h-11 w-fit rounded-md px-3 text-sm text-theme-text hover:bg-theme-primary/10 disabled:opacity-50"
          disabled={startInFlight}
          onclick={() => (startApproach = "choose")}
        >
          Change starting approach
        </button>
        <WorldEntrySetup
          bind:setup={worldSetup}
          {characters}
          {locations}
          calendar={calendarStore.config}
          onContinue={reviewWorldEntry}
        />
      {:else if !selectedRumour && startApproach === "preview" && worldPreview}
        <WorldEntryContextPreview
          preview={worldPreview}
          starting={worldStartBusy}
          error={worldStartError}
          onBack={() => {
            if (!startInFlight) startApproach = "world";
          }}
          onStart={() => void startWorldEntry()}
        />
      {:else}
        {#if !selectedRumour}
          <button
            type="button"
            data-testid="adventure-change-start"
            class="flex min-h-11 w-fit items-center gap-2 rounded-md px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
            disabled={startInFlight}
            onclick={() => (startApproach = "choose")}
          >
            <span class="icon-[lucide--arrow-left] h-4 w-4" aria-hidden="true"
            ></span>
            Change starting approach
          </button>
        {/if}
        <AdventureStart
          manager={oracle.adventure}
          {vaultId}
          bind:title={startTitle}
          bind:premise={startPremise}
          bind:characterName={startCharacterName}
          bind:selectedCharacterId={startCharacterId}
          bind:characterDescription={startCharacterDescription}
          {characters}
          scenarioSeed={selectedRumour?.scenario}
          onScenarioStarted={() => rumourAdventureHandoff.clear()}
          onCancelScenario={cancelRumour}
        />
      {/if}
    {/if}
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
