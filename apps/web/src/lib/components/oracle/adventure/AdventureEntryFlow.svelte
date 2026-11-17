<script lang="ts">
  import type { WorldCalendar } from "chronology-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { PendingAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
  import type { WorldEntryChoice } from "#lib/services/adventure/world-entry-setup.js";
  import type { AdventureStartDraft } from "./adventure-start-draft.svelte.js";
  import type { AdventureWorldEntry } from "./adventure-world-entry.svelte.js";
  import type { AdventureRumourActions } from "./adventure-rumour-actions.svelte.js";
  import type { AdventureImportController } from "./adventure-import.svelte.js";
  import type { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventureEntryChoices from "./AdventureEntryChoices.svelte";
  import ApprovedAdventurePackages from "./ApprovedAdventurePackages.svelte";
  import AdventureImportReview from "./AdventureImportReview.svelte";
  import WorldEntrySetup from "./WorldEntrySetup.svelte";
  import WorldEntryContextPreview from "./WorldEntryContextPreview.svelte";

  let {
    manager,
    vaultId,
    draft,
    worldEntry,
    rumours,
    imports,
    library,
    selectedRumour,
    characters,
    locations,
    calendar,
    canDiscover,
    canImport,
    onDiscover,
    onSurpriseMe,
    onScenarioStarted,
  }: {
    manager: AdventureManager;
    vaultId: string;
    draft: AdventureStartDraft;
    worldEntry: AdventureWorldEntry;
    rumours: AdventureRumourActions;
    imports: AdventureImportController;
    library: AdventurePackageLibrary;
    selectedRumour: PendingAdventureHandoff | null;
    characters: WorldEntryChoice[];
    locations: WorldEntryChoice[];
    calendar: WorldCalendar;
    canDiscover: boolean;
    canImport: boolean;
    onDiscover: () => void;
    onSurpriseMe: () => void;
    onScenarioStarted: () => void;
  } = $props();

  // A form must stay mounted until its current start finishes.
  const startInFlight = $derived(manager.starting || worldEntry.busy);
</script>

{#if !selectedRumour && draft.approach === "choose"}
  <AdventureEntryChoices
    {canDiscover}
    {canImport}
    importError={imports.error}
    importValidationErrors={imports.validationErrors}
    importing={imports.inFlight}
    {onDiscover}
    {onSurpriseMe}
    onOwnPremise={() => {
      draft.sourcePackage = undefined;
      draft.approach = "premise";
    }}
    onEnterWorld={() => (draft.approach = "world")}
    onImportFile={imports.importJson}
    onImportExperimentalFile={imports.importExperimental}
  />

  {#if imports.duplicate}
    <p
      class="mx-auto w-full max-w-5xl rounded-lg border border-theme-primary/40 bg-theme-primary/10 p-3 text-sm text-theme-text"
      role="status"
      data-testid="adventure-import-duplicate-notice"
    >
      Already imported: “{imports.duplicate.package.title}” ({imports.duplicate
        .package.id} v{imports.duplicate.package.version}) · {imports.duplicate.hash.slice(
        0,
        12,
      )}
    </p>
  {/if}

  <ApprovedAdventurePackages {library} onStart={draft.fromPackage} />
{:else if !selectedRumour && draft.approach === "import-review" && imports.draft}
  <AdventureImportReview
    bind:draft={imports.draft}
    experimentalOrigin={imports.experimentalOrigin}
    previousPackage={imports.predecessor?.package ?? null}
    previousHash={imports.predecessor?.hash ?? null}
    approving={imports.approving}
    approveError={imports.approveError}
    onApprove={imports.approve}
    onStartAdventure={draft.fromPackage}
    onCancel={imports.cancel}
  />
{:else if !selectedRumour && draft.approach === "world"}
  <button
    type="button"
    data-testid="world-entry-change-approach"
    class="min-h-11 w-fit rounded-md px-3 text-sm text-theme-text hover:bg-theme-primary/10 disabled:opacity-50"
    disabled={startInFlight}
    onclick={() => (draft.approach = "choose")}
  >
    Change starting approach
  </button>
  <WorldEntrySetup
    bind:setup={worldEntry.setup}
    {characters}
    {locations}
    {calendar}
    onContinue={worldEntry.review}
  />
{:else if !selectedRumour && draft.approach === "preview" && worldEntry.preview}
  <WorldEntryContextPreview
    preview={worldEntry.preview}
    starting={worldEntry.busy}
    error={worldEntry.error}
    onBack={() => {
      if (!startInFlight) draft.approach = "world";
    }}
    onStart={() => void worldEntry.start()}
  />
{:else}
  {#if !selectedRumour}
    <button
      type="button"
      data-testid="adventure-change-start"
      class="flex min-h-11 w-fit items-center gap-2 rounded-md px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
      disabled={startInFlight}
      onclick={() => (draft.approach = "choose")}
    >
      <span class="icon-[lucide--arrow-left] h-4 w-4" aria-hidden="true"></span>
      Change starting approach
    </button>
  {/if}
  <AdventureStart
    {manager}
    {vaultId}
    bind:title={draft.title}
    bind:premise={draft.premise}
    bind:characterName={draft.characterName}
    bind:selectedCharacterId={draft.characterId}
    bind:characterDescription={draft.characterDescription}
    {characters}
    scenarioSeed={selectedRumour?.scenario}
    sourcePackage={draft.sourcePackage}
    {onScenarioStarted}
    onCancelScenario={rumours.cancel}
    onClearSourcePackage={() => {
      draft.sourcePackage = undefined;
    }}
  />
{/if}
