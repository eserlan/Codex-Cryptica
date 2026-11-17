<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { calendarStore } from "#lib/stores/calendar.svelte.js";
  import AdventureEntryFlow from "./AdventureEntryFlow.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import { AdventureImportController } from "./adventure-import.svelte.js";
  import { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
  import { AdventureStartDraft } from "./adventure-start-draft.svelte.js";
  import { AdventureWorldEntry } from "./adventure-world-entry.svelte.js";
  import { AdventureRumourActions } from "./adventure-rumour-actions.svelte.js";
  import AdventureFocusPlay from "./AdventureFocusPlay.svelte";
  import AdventureRumourConflict from "./AdventureRumourConflict.svelte";
  import { adventurePackageRepository } from "#lib/services/adventure/adventure-package-storage.js";
  import { configureAdventureSurfaceRuntime } from "./adventure-surface-runtime.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { adventureSessionRepository } from "#lib/services/adventure/adventure-session-repository.js";
  import { AdventureSurfacePromotion } from "./adventure-surface-promotion.js";
  import { adventurePromotionSettings } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
  import { rumourAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
  import { characterChoices } from "#lib/services/solo-characters.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { isVaultReadyForGenerators } from "#lib/stores/vault/readiness.js";

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
  const canImport = $derived(canDiscover);
  const draft = new AdventureStartDraft();
  const worldEntry = new AdventureWorldEntry({
    manager: oracle.adventure,
    getVaultId: () => vaultId,
    getEntities: () => oracle.vault.allEntities,
    getCharacters: () => characters,
    getLocations: () => locations,
    getCalendar: () => calendarStore.config,
    getPrecheck: () => ({
      aiDisabled: discoveryPolicyStore.aiDisabled,
      online: typeof navigator === "undefined" || navigator.onLine,
    }),
    onReview: () => {
      draft.approach = "preview";
    },
    onStarted: () => {
      draft.approach = "choose";
    },
  });
  const rumours = new AdventureRumourActions({
    manager: oracle.adventure,
    handoff: rumourAdventureHandoff,
    draft,
    getVaultId: () => vaultId,
    openGenerator: (id) => modalUIStore.openIntentGeneratorWorkflow(id),
  });
  const imports = new AdventureImportController({
    getVaultId: () => oracle.vault.activeVaultId ?? "default",
    canImport: () => canImport,
    isGuest: () => vault.isGuest,
    saveApproved: (id, pkg) =>
      adventurePackageRepository.saveApprovedJson(id, pkg),
    listApproved: (id) =>
      adventurePackageRepository.listApproved?.(id) ?? Promise.resolve([]),
    notify: (message) => notificationStore.notify(message, "success"),
    onReview: () => {
      draft.approach = "import-review";
    },
    onCancel: () => {
      draft.approach = "choose";
    },
    onApproved: (id) => {
      void library.refresh(id);
    },
  });
  const library = new AdventurePackageLibrary({
    getVaultId: () => vaultId,
    isReady: () => oracle.vault.isInitialized,
    isGuest: () => vault.isGuest,
    listPackages: (id) =>
      adventurePackageRepository.listApproved?.(id) ?? Promise.resolve([]),
    listSessions: (id) => adventureSessionRepository.list(id),
    open: (id, sessionId) => oracle.adventure.open(id, sessionId),
    resumeArchived: (id, sessionId) =>
      oracle.adventure.resumeArchived(id, sessionId),
  });
  let previousVaultId: string | null = null;
  onDestroy(() => imports.destroy());
  let restoringActiveAdventure = $state(true);
  let activeRestoreRequest = 0;

  // Never carry an unsaved character or premise draft between vaults.
  $effect(() => {
    const currentVaultId = vaultId;
    if (previousVaultId === null) worldEntry.reset(currentVaultId);
    if (previousVaultId !== null && previousVaultId !== currentVaultId) {
      draft.reset();
      worldEntry.reset(currentVaultId);
      imports.reset();
      library.reset();
    }
    previousVaultId = currentVaultId;
  });

  function discoverAdventure(): void {
    if (!canDiscover) return;
    modalUIStore.openIntentGeneratorWorkflow("rumour");
  }

  $effect(() => {
    const currentVaultId = vaultId;
    const ready = oracle.vault.isInitialized;
    const hasSession = Boolean(oracle.adventure.session);
    if (!ready || hasSession || vault.isGuest) return;
    void untrack(() => library.refresh(currentVaultId));
  });

  $effect(() => {
    draft.prefillRumour(selectedRumour);
  });

  let existingEntityTitles = $derived(
    oracle.vault.allEntities.map((entity) => entity.title),
  );
  configureAdventureSurfaceRuntime(oracle.vault, oracle.adventure, {
    getCalendar: () => calendarStore.getSnapshot().config,
    getRumourPolicy: () => ({
      isEnabled: oracle.isEnabled,
      isAvailable: !vault.isGuest,
    }),
    getTheme: () => themeStore.worldThemeId ?? "workspace",
  });

  const promotions = new AdventureSurfacePromotion({
    getSession: () => oracle.adventure.session,
    getVaultId: () => oracle.vault.activeVaultId,
    getEntities: () => oracle.vault.allEntities,
    isReady: () => oracle.vault.isInitialized,
    isAutoPromote: () => adventurePromotionSettings.autoPromote,
    createEntity: (type, title, data) =>
      oracle.vault.createEntity(type, title, data),
    linkPlaceRecord: (name, recordId) =>
      oracle.adventure.linkPlaceRecord(name, recordId),
    notify: (message, level) => notificationStore.notify(message, level),
  });

  $effect(() => {
    void promotions.autoPromote(existingEntityTitles);
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
        archiving={rumours.archiving}
        error={rumours.error}
        onAdd={() => void rumours.add()}
        onContinue={() => rumourAdventureHandoff.clear()}
        onCancel={rumours.cancel}
        onArchive={() => void rumours.archive()}
      />
    {/if}
    {#key oracle.adventure.session.id}
      <AdventureFocusPlay
        manager={oracle.adventure}
        existingTitles={existingEntityTitles}
        onAddProvisionalFact={promotions.add}
        onAddAllProvisionalFacts={promotions.addAll}
        repository={adventureSessionRepository}
        {vaultId}
        onResume={(sessionId) => oracle.adventure.switchTo(vaultId, sessionId)}
        onResumeArchived={async (sessionId) => {
          await oracle.adventure.resumeArchived(vaultId, sessionId);
        }}
      />
    {/key}
  {:else}
    <AdventureEntryFlow
      manager={oracle.adventure}
      {vaultId}
      {draft}
      {worldEntry}
      {rumours}
      {imports}
      {library}
      {selectedRumour}
      {characters}
      {locations}
      calendar={calendarStore.config}
      {canDiscover}
      {canImport}
      onDiscover={discoverAdventure}
      onSurpriseMe={() => modalUIStore.openIntentGeneratorWorkflow("adventure")}
      onScenarioStarted={() => rumourAdventureHandoff.clear()}
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
