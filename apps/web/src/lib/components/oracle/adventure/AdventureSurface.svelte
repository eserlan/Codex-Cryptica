<!-- fallow-ignore-file complexity -- Existing adventure entry and restoration view; only filtering of dismissed facts changed. -->
<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { oracle } from "#lib/stores/oracle.svelte.js";
  import { calendarStore } from "#lib/stores/calendar.svelte.js";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventureEntryChoices, {
    type ImportValidationIssue,
  } from "./AdventureEntryChoices.svelte";
  import AdventureImportReview from "./AdventureImportReview.svelte";
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
  import {
    adventureSourcePackageToAdventureJson,
    compareAdventureJsonVersion,
    computeAdventureJsonHash,
    parseAdventureMarkdown,
    selectAdventureJsonPredecessor,
    validateAdventureJson,
    MAX_ADVENTURE_JSON_BYTES,
    MAX_ADVENTURE_MARKDOWN_BYTES,
    MAX_ADVENTURE_PDF_BYTES,
    MAX_TEXT_CHARS,
    type AdventureJsonV1,
    type AdventureSourcePackageRef,
    type ScenarioItem,
    type StoredAdventurePackage,
  } from "@codex/adventure-engine";
  import { adventurePackageRepository } from "#lib/services/adventure/adventure-package-storage.js";
  import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
  import { createAdventureBackgroundRequest } from "#lib/services/adventure/adventure-background-request.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { createCampaignGeneratorService } from "#lib/components/generators/campaign-generator-service.js";
  import { adventureContextService } from "#lib/services/adventure/adventure-context-service.js";
  import {
    adventureSessionRepository,
    type AdventureArchiveEntry,
  } from "#lib/services/adventure/adventure-session-repository.js";
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
  const canImport = $derived(
    isVaultReadyForGenerators(vault) && !vault.isGuest,
  );
  // The typed world-entry draft lives here so view transitions cannot erase it.
  let worldSetup = $state(emptyWorldEntrySetup("default"));
  let startApproach = $state<
    "choose" | "premise" | "world" | "preview" | "import-review"
  >("choose");
  let worldPreview = $state<ContextPreview | null>(null);
  let worldStartBusy = $state(false);
  // Leaving a start form mid-start would remount it with a fresh local guard.
  const startInFlight = $derived(oracle.adventure.starting || worldStartBusy);
  let worldStartError = $state<string | null>(null);
  let importDraft = $state<AdventureJsonV1 | null>(null);
  let importExperimentalOrigin = $state<"markdown" | "pdf" | null>(null);
  let importDraftVaultId: string | null = null;
  let importError = $state<string | null>(null);
  let importValidationErrors = $state<ImportValidationIssue[]>([]);
  let importInFlight = $state(false);
  let importApproving = $state(false);
  let importApproveError = $state<string | null>(null);
  let importDuplicateNotice = $state<{
    title: string;
    id: string;
    version: string;
    hash: string;
  } | null>(null);
  let importPredecessor = $state<StoredAdventurePackage | null>(null);
  let removingPackageHash = $state<string | null>(null);
  let packageRemovalMessage = $state<string | null>(null);
  let packageRemovalError = $state<string | null>(null);
  let approvedPackages = $state<StoredAdventurePackage[]>([]);
  let pinnedSessionsByHash = $state<Map<string, AdventureArchiveEntry[]>>(
    new Map(),
  );
  let resumingPinnedId = $state<string | null>(null);
  let pinnedResumeError = $state<string | null>(null);
  let packagesLoadToken = 0;
  let previousVaultId: string | null = null;
  let importRequestToken = 0;
  let importAbortController: AbortController | null = null;

  function abortActiveImport(): void {
    importAbortController?.abort();
    importAbortController = null;
  }

  onDestroy(() => {
    importRequestToken += 1;
    abortActiveImport();
  });
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
  let startSourcePackage = $state<AdventureSourcePackageRef | undefined>(
    undefined,
  );

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
      startSourcePackage = undefined;
      worldSetup = emptyWorldEntrySetup(currentVaultId);
      worldPreview = null;
      worldStartBusy = false;
      worldStartError = null;
      importDraft = null;
      importExperimentalOrigin = null;
      importDraftVaultId = null;
      importPredecessor = null;
      importDuplicateNotice = null;
      packageRemovalMessage = null;
      packageRemovalError = null;
      importError = null;
      importValidationErrors = [];
      importInFlight = false;
      importApproving = false;
      importApproveError = null;
      approvedPackages = [];
      pinnedSessionsByHash = new Map();
      packagesLoadToken += 1;
      importRequestToken += 1;
      abortActiveImport();
      worldLaunchToken += 1;
    }
    previousVaultId = currentVaultId;
  });

  function discoverAdventure(): void {
    if (!canDiscover) return;
    modalUIStore.openIntentGeneratorWorkflow("rumour");
  }

  function isJsonAdventureFile(file: File): boolean {
    return (
      file.type === "application/json" ||
      file.type === "text/json" ||
      /\.json$/i.test(file.name)
    );
  }

  function isPdfAdventureFile(file: File): boolean {
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  }

  function activeImportVaultId(): string {
    return oracle.vault.activeVaultId ?? "default";
  }

  function isCurrentImport(requestToken: number, sourceVaultId: string) {
    return (
      requestToken === importRequestToken &&
      activeImportVaultId() === sourceVaultId &&
      !vault.isGuest
    );
  }

  function buildPackagePremise(pkg: AdventureJsonV1): string {
    const parts = [
      pkg.premise.hook.trim(),
      pkg.premise.background.trim(),
    ].filter(Boolean);
    const combined = parts.join("\n\n") || pkg.description?.trim() || pkg.title;
    if (combined.length <= MAX_TEXT_CHARS) return combined;
    return `${combined.slice(0, MAX_TEXT_CHARS - 1).trimEnd()}…`;
  }

  function startFromApprovedPackage(pkg: AdventureJsonV1, hash: string): void {
    startTitle = pkg.title.slice(0, MAX_TEXT_CHARS);
    startPremise = buildPackagePremise(pkg);
    startSourcePackage = {
      packageId: pkg.id,
      version: pkg.version,
      formatVersion: pkg.formatVersion,
      hash,
    };
    startApproach = "premise";
  }

  async function resumePinnedSession(
    entry: AdventureArchiveEntry,
  ): Promise<void> {
    if (resumingPinnedId) return;
    resumingPinnedId = entry.id;
    pinnedResumeError = null;
    try {
      if (entry.status === "archived") {
        await oracle.adventure.resumeArchived(vaultId, entry.id);
      } else {
        await oracle.adventure.open(vaultId, entry.id);
      }
    } catch (error) {
      pinnedResumeError =
        error instanceof Error
          ? error.message
          : "Unable to resume this adventure.";
    } finally {
      resumingPinnedId = null;
    }
  }

  async function refreshApprovedPackages(
    requestedVaultId = vaultId,
  ): Promise<void> {
    if (!oracle.vault.isInitialized || vault.isGuest) {
      approvedPackages = [];
      pinnedSessionsByHash = new Map();
      return;
    }
    const token = ++packagesLoadToken;
    try {
      const [pkgs, sessions] = await Promise.all([
        adventurePackageRepository.listApproved?.(requestedVaultId) ??
          Promise.resolve([]),
        adventureSessionRepository.list(requestedVaultId),
      ]);
      if (token !== packagesLoadToken || requestedVaultId !== vaultId) return;
      approvedPackages = pkgs;
      const byHash = new Map<string, AdventureArchiveEntry[]>();
      for (const entry of sessions.entries) {
        if (entry.loadCondition === "normal" && entry.sourcePackage?.hash) {
          const list = byHash.get(entry.sourcePackage.hash) ?? [];
          list.push(entry);
          byHash.set(entry.sourcePackage.hash, list);
        }
      }
      pinnedSessionsByHash = byHash;
    } catch {
      if (token === packagesLoadToken && requestedVaultId === vaultId) {
        approvedPackages = [];
        pinnedSessionsByHash = new Map();
      }
    }
  }

  const groupedApprovedPackages = $derived.by(() => {
    const groups = new Map<
      string,
      { id: string; title: string; versions: StoredAdventurePackage[] }
    >();
    for (const item of approvedPackages) {
      const group = groups.get(item.package.id) ?? {
        id: item.package.id,
        title: item.package.title,
        versions: [],
      };
      group.versions.push(item);
      groups.set(item.package.id, group);
    }
    for (const group of groups.values()) {
      group.versions.sort((a, b) => {
        const byVersion = compareAdventureJsonVersion(
          b.package.version,
          a.package.version,
        );
        if (byVersion !== 0) return byVersion;
        return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0;
      });
    }
    return [...groups.values()];
  });

  async function storedPackagesForImport(
    sourceVaultId: string,
  ): Promise<StoredAdventurePackage[]> {
    try {
      const fresh =
        await adventurePackageRepository.listApproved?.(sourceVaultId);
      if (fresh) return fresh;
    } catch {
      // Fall back to the already-loaded list below.
    }
    return approvedPackages;
  }

  /** Dedup check + predecessor lookup before a validated package enters review. */
  async function enterImportReview(
    pkg: AdventureJsonV1,
    experimentalOrigin: "markdown" | "pdf" | null,
    sourceVaultId: string,
  ): Promise<void> {
    const stored = await storedPackagesForImport(sourceVaultId);
    const hash = await computeAdventureJsonHash(pkg);
    const duplicate = stored.find((item) => item.hash === hash);
    if (duplicate) {
      importDuplicateNotice = {
        title: duplicate.package.title,
        id: duplicate.package.id,
        version: duplicate.package.version,
        hash: duplicate.hash,
      };
      return;
    }
    importDuplicateNotice = null;
    const predecessor = selectAdventureJsonPredecessor(stored, pkg, hash);
    importPredecessor = predecessor
      ? {
          hash: predecessor.hash,
          path: "",
          package: predecessor.package,
          originFormat: "adventure-json/v1",
        }
      : null;
    importDraft = pkg;
    importExperimentalOrigin = experimentalOrigin;
    importDraftVaultId = sourceVaultId;
    startApproach = "import-review";
  }

  async function handleRemoveApprovedPackage(
    item: StoredAdventurePackage,
  ): Promise<void> {
    if (removingPackageHash) return;
    removingPackageHash = item.hash;
    packageRemovalMessage = null;
    packageRemovalError = null;
    try {
      const result = await adventurePackageRepository.removeApproved?.(
        vaultId,
        item.hash,
        new Set(pinnedSessionsByHash.keys()),
      );
      if (!result) {
        packageRemovalError =
          "Removing approved packages is not available here.";
        return;
      }
      if (result.status === "refused") {
        packageRemovalError = result.reason;
        return;
      }
      packageRemovalMessage = `Removed "${item.package.title}" v${item.package.version}.`;
      void refreshApprovedPackages(vaultId);
    } catch (error) {
      packageRemovalError =
        error instanceof Error
          ? error.message
          : "Unable to remove this approved package version.";
    } finally {
      removingPackageHash = null;
    }
  }

  $effect(() => {
    const currentVaultId = vaultId;
    const ready = oracle.vault.isInitialized;
    const hasSession = Boolean(oracle.adventure.session);
    if (!ready || hasSession || vault.isGuest) return;
    void untrack(() => refreshApprovedPackages(currentVaultId));
  });

  function beginImportRequest(): {
    abortController: AbortController;
    requestToken: number;
    sourceVaultId: string;
  } | null {
    abortActiveImport();
    const abortController = new AbortController();
    importAbortController = abortController;
    const requestToken = ++importRequestToken;
    const sourceVaultId = activeImportVaultId();
    importError = null;
    importValidationErrors = [];
    importApproveError = null;
    if (!canImport || vault.isGuest) {
      importInFlight = false;
      importError = "Adventure import is only available in an owner Vault.";
      return null;
    }
    return { abortController, requestToken, sourceVaultId };
  }

  async function runImportFile(
    validateFile: () => string | null,
    fallbackError: string,
    processBytes: (
      bytes: Uint8Array,
      request: NonNullable<ReturnType<typeof beginImportRequest>>,
    ) => Promise<void>,
    file: File,
  ): Promise<void> {
    const request = beginImportRequest();
    if (!request) return;
    const { abortController, requestToken, sourceVaultId } = request;
    const sizeOrTypeError = validateFile();
    if (sizeOrTypeError) {
      importInFlight = false;
      importError = sizeOrTypeError;
      return;
    }
    importInFlight = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isCurrentImport(requestToken, sourceVaultId)) return;
      if (abortController.signal.aborted) return;
      await processBytes(bytes, request);
    } catch (error) {
      if (abortController.signal.aborted) return;
      if (isCurrentImport(requestToken, sourceVaultId)) {
        importError = error instanceof Error ? error.message : fallbackError;
      }
    } finally {
      if (importAbortController === abortController) {
        importAbortController = null;
      }
      if (requestToken === importRequestToken) importInFlight = false;
    }
  }

  async function handleImportJsonFile(file: File): Promise<void> {
    await runImportFile(
      () => {
        if (!isJsonAdventureFile(file)) {
          return "Please choose an Adventure JSON (.json) file, or use the experimental Markdown/PDF convenience option below.";
        }
        if (file.size > MAX_ADVENTURE_JSON_BYTES) {
          return "Adventure JSON files must be 10 MiB or smaller.";
        }
        return null;
      },
      "Unable to read the selected Adventure JSON file.",
      async (bytes, { sourceVaultId }) => {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (parseError) {
          importError = "Adventure JSON could not be parsed.";
          importValidationErrors = [
            {
              code: "INVALID_JSON",
              message:
                parseError instanceof Error
                  ? parseError.message
                  : "Malformed JSON document.",
            },
          ];
          return;
        }

        const validation = validateAdventureJson(parsed);
        if (!validation.ok) {
          importError = "Adventure JSON validation failed.";
          importValidationErrors = validation.errors;
          return;
        }

        await enterImportReview(validation.value, null, sourceVaultId);
      },
      file,
    );
  }

  async function handleImportExperimentalFile(file: File): Promise<void> {
    const isPdf = isPdfAdventureFile(file);
    await runImportFile(
      () => {
        if (!isPdf && file.size > MAX_ADVENTURE_MARKDOWN_BYTES) {
          return "Adventure Markdown files must be 2 MiB or smaller.";
        }
        if (isPdf && file.size > MAX_ADVENTURE_PDF_BYTES) {
          return "Adventure PDF files must be 20 MiB or smaller.";
        }
        return null;
      },
      "Unable to read the selected adventure file.",
      async (bytes, { abortController, requestToken, sourceVaultId }) => {
        const result = isPdf
          ? await (async () => {
              const { importAdventurePdfFile } =
                await import("#lib/services/adventure/adventure-pdf-import.js");
              return importAdventurePdfFile(
                bytes,
                file.name,
                abortController.signal,
              );
            })()
          : await parseAdventureMarkdown(bytes, {
              fileName: file.name,
            });
        if (!isCurrentImport(requestToken, sourceVaultId)) return;
        if (!result.ok) {
          if (result.error.code === "ABORTED") return;
          importError = result.error.message;
          return;
        }
        const adapted = adventureSourcePackageToAdventureJson(result.package);
        const validation = validateAdventureJson(adapted);
        if (!validation.ok) {
          importError = "Converted adventure failed Adventure JSON validation.";
          importValidationErrors = validation.errors;
          return;
        }
        await enterImportReview(
          validation.value,
          isPdf ? "pdf" : "markdown",
          sourceVaultId,
        );
      },
      file,
    );
  }

  async function handleApproveImport(approved: AdventureJsonV1): Promise<void> {
    const sourceVaultId = importDraftVaultId;
    const requestToken = importRequestToken;
    if (
      !sourceVaultId ||
      activeImportVaultId() !== sourceVaultId ||
      vault.isGuest
    ) {
      const error = new Error(
        "Return to the owner Vault where this adventure was imported to approve it.",
      );
      importApproveError = error.message;
      throw error;
    }

    importApproving = true;
    importApproveError = null;
    try {
      const saved = await adventurePackageRepository.saveApprovedJson(
        sourceVaultId,
        approved,
      );
      if (!isCurrentImport(requestToken, sourceVaultId)) return;
      importDraft = saved.package;
      importPredecessor = null;
      notificationStore.notify(
        saved.status === "deduplicated"
          ? `"${saved.package.title}" was already imported.`
          : `Approved "${saved.package.title}" for local play.`,
        "success",
      );
      void refreshApprovedPackages(sourceVaultId);
    } catch (error) {
      if (isCurrentImport(requestToken, sourceVaultId)) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to save the approved adventure package.";
        importApproveError = message;
      }
      throw error;
    } finally {
      if (requestToken === importRequestToken) importApproving = false;
    }
  }

  function handleCancelImport(): void {
    abortActiveImport();
    importRequestToken += 1;
    importDraft = null;
    importExperimentalOrigin = null;
    importDraftVaultId = null;
    importPredecessor = null;
    importDuplicateNotice = null;
    importError = null;
    importValidationErrors = [];
    importInFlight = false;
    importApproveError = null;
    startApproach = "choose";
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
    const originatingVaultId = oracle.vault.activeVaultId;
    const isCurrent = () =>
      oracle.adventure.session?.id === session.id &&
      oracle.vault.activeVaultId === originatingVaultId;
    const draft = createAdventureEntityDraft(fact, session.title);
    if (!draft) throw new Error("This discovery is not available to save.");
    const existing = oracle.vault.allEntities.find(
      (entity) =>
        entity.title.trim().toLocaleLowerCase() ===
        draft.title.toLocaleLowerCase(),
    );
    if (existing) {
      if (!isCurrent())
        throw new Error("The active adventure or Vault changed.");
      await linkPlaceToRecord(fact, existing.id);
      notificationStore.notify(`${draft.title} is already in Codex.`, "info");
      return;
    }
    const { added, interrupted } = await promoteProvisionalFacts(
      [fact],
      session.title,
      promotionDeps(session.id, originatingVaultId),
    );
    if (interrupted) throw new Error("The active adventure or Vault changed.");
    if (added > 0)
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
        {canImport}
        {importError}
        {importValidationErrors}
        importing={importInFlight}
        onDiscover={discoverAdventure}
        onSurpriseMe={() =>
          modalUIStore.openIntentGeneratorWorkflow("adventure")}
        onOwnPremise={() => {
          startSourcePackage = undefined;
          startApproach = "premise";
        }}
        onEnterWorld={() => (startApproach = "world")}
        onImportFile={handleImportJsonFile}
        onImportExperimentalFile={handleImportExperimentalFile}
      />

      {#if importDuplicateNotice}
        <div
          role="status"
          aria-live="polite"
          class="mx-auto w-full max-w-5xl rounded-lg border border-theme-primary/50 bg-theme-primary/10 p-3 text-sm text-theme-text"
          data-testid="adventure-import-duplicate-notice"
        >
          Already imported: "{importDuplicateNotice.title}" ({importDuplicateNotice.id}
          v{importDuplicateNotice.version}, {importDuplicateNotice.hash.slice(
            0,
            12,
          )}). This exact version is in your Vault, so nothing was written and
          your current review is unchanged.
        </div>
      {/if}

      {#if approvedPackages.length > 0}
        <section
          class="mx-auto w-full max-w-5xl space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
          aria-labelledby="approved-packages-heading"
          data-testid="approved-adventure-packages"
        >
          <h2
            id="approved-packages-heading"
            class="font-header text-lg font-semibold text-theme-text"
          >
            Approved Adventure Packages
          </h2>
          {#each groupedApprovedPackages as group (group.id)}
            <div
              class="space-y-2"
              data-testid="approved-package-group-{group.id}"
            >
              <h3 class="font-semibold text-theme-text">
                {group.title}
                <span class="font-mono text-xs font-normal text-theme-text">
                  {group.id}
                </span>
                {#if group.versions.length > 1}
                  <span class="text-xs font-normal text-theme-text">
                    ({group.versions.length} versions)
                  </span>
                {/if}
              </h3>
              <ul class="space-y-2">
                {#each group.versions as item (item.hash)}
                  {@const pinned = pinnedSessionsByHash.get(item.hash) ?? []}
                  {@const latestPinned = pinned[0]}
                  <li
                    class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-theme-border bg-theme-bg p-3"
                    data-testid="approved-package-item-{item.package
                      .id}-{item.hash.slice(0, 8)}"
                  >
                    <div class="min-w-0 space-y-0.5">
                      <p class="font-semibold text-theme-text">
                        {item.package.title}
                      </p>
                      <p class="font-mono text-xs text-theme-text">
                        {item.package.id} v{item.package.version} · {item.hash.slice(
                          0,
                          12,
                        )}
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      {#if latestPinned}
                        <button
                          type="button"
                          data-testid="approved-package-resume-{item.package
                            .id}-{item.hash.slice(0, 8)}"
                          disabled={resumingPinnedId !== null}
                          onclick={() => void resumePinnedSession(latestPinned)}
                          class="min-h-10 rounded-lg border border-theme-primary/50 bg-theme-surface px-3 py-1.5 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resumingPinnedId === latestPinned.id
                            ? "Resuming…"
                            : `Resume (${latestPinned.title})`}
                        </button>
                      {/if}
                      <button
                        type="button"
                        data-testid="approved-package-start-{item.package
                          .id}-{item.hash.slice(0, 8)}"
                        onclick={() =>
                          startFromApprovedPackage(item.package, item.hash)}
                        class="min-h-10 rounded-lg bg-theme-primary px-3 py-1.5 text-sm font-semibold text-theme-on-primary transition hover:opacity-90"
                      >
                        Start new session
                      </button>
                      <button
                        type="button"
                        data-testid="approved-package-remove-{item.package
                          .id}-{item.hash.slice(0, 8)}"
                        disabled={removingPackageHash !== null}
                        onclick={() => void handleRemoveApprovedPackage(item)}
                        class="min-h-10 rounded-lg border border-theme-danger/50 bg-theme-surface px-3 py-1.5 text-sm font-medium text-theme-text transition hover:bg-theme-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingPackageHash === item.hash
                          ? "Removing…"
                          : "Remove"}
                      </button>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
          {#if packageRemovalMessage}
            <p
              class="text-sm text-theme-text"
              role="status"
              data-testid="approved-package-removal-message"
            >
              {packageRemovalMessage}
            </p>
          {/if}
          {#if packageRemovalError}
            <p
              class="text-sm text-theme-danger"
              role="alert"
              data-testid="approved-package-removal-error"
            >
              {packageRemovalError}
            </p>
          {/if}
          {#if pinnedResumeError}
            <p class="text-sm text-theme-danger" role="alert">
              {pinnedResumeError}
            </p>
          {/if}
        </section>
      {/if}
    {:else}
      {#if !selectedRumour && startApproach === "import-review" && importDraft}
        <AdventureImportReview
          bind:draft={importDraft}
          experimentalOrigin={importExperimentalOrigin}
          previousPackage={importPredecessor?.package ?? null}
          previousHash={importPredecessor?.hash ?? null}
          approving={importApproving}
          approveError={importApproveError}
          onApprove={handleApproveImport}
          onStartAdventure={(pkg, hash) => startFromApprovedPackage(pkg, hash)}
          onCancel={handleCancelImport}
        />
      {:else if !selectedRumour && startApproach === "world"}
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
          sourcePackage={startSourcePackage}
          onScenarioStarted={() => rumourAdventureHandoff.clear()}
          onCancelScenario={cancelRumour}
          onClearSourcePackage={() => {
            startSourcePackage = undefined;
          }}
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
