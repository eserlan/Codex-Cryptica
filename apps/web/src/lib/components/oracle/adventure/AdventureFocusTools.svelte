<script lang="ts">
  import type { Snippet } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type {
    AdventureListResult,
    AdventureSessionRepository,
  } from "#lib/services/adventure/adventure-session-repository.js";
  import type { AdventureFocusArtwork } from "./adventure-focus-artwork.svelte.js";
  import { containTab } from "./adventure-phone-surface";
  import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import AdventureArtworkCueDetails from "./artwork/AdventureArtworkCueDetails.svelte";
  import ArtworkSettings from "./artwork/ArtworkSettings.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureCorrectionForm from "./AdventureCorrectionForm.svelte";
  import AdventurePackageAudit from "./AdventurePackageAudit.svelte";
  import AdventurePackageProgress from "./AdventurePackageProgress.svelte";
  import AdventureResourceCounters from "./AdventureResourceCounters.svelte";
  import AdventureRollHistory from "./AdventureRollHistory.svelte";
  import AdventureSituationSettings from "./AdventureSituationSettings.svelte";
  let {
    manager,
    repository,
    vaultId,
    onResume,
    onResumeArchived,
    listAdventureSessions,
    phone,
    adventureTitle,
    artwork,
    toolsCloseButton = $bindable(),
    onClose,
    controls,
    fullscreenControl,
    management,
  }: {
    manager: AdventureManager;
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume: (sessionId: string) => Promise<void>;
    onResumeArchived: (sessionId: string) => Promise<void>;
    listAdventureSessions: (
      vaultId: string,
      forceFresh?: boolean,
    ) => Promise<AdventureListResult>;
    phone: boolean;
    adventureTitle: string;
    artwork: AdventureFocusArtwork;
    toolsCloseButton?: HTMLButtonElement;
    onClose: () => void;
    controls: Snippet<[boolean]>;
    fullscreenControl: Snippet<[boolean]>;
    management: Snippet<[boolean]>;
  } = $props();
  let utilitiesSheet = $state<HTMLElement>();
</script>

<button
  type="button"
  class="absolute inset-0 z-20 bg-theme-bg/70"
  aria-label="Close adventure tools"
  onclick={onClose}
></button>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<aside
  bind:this={utilitiesSheet}
  class="adventure-scrollbar absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-y-auto rounded-t-xl border-t border-theme-border bg-theme-surface p-4 shadow-2xl"
  id="adventure-utilities"
  aria-label="Adventure tools"
  onkeydown={(event) => {
    if (phone && utilitiesSheet) containTab(event, utilitiesSheet);
  }}
>
  <div class="mb-3 flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h3 class="font-header text-base font-bold text-theme-text">
        Adventure tools
      </h3>
      {#if phone}
        <p
          class="mt-0.5 break-words text-xs text-theme-text"
          data-testid="adventure-tools-full-title"
        >
          {adventureTitle}
        </p>
      {/if}
    </div>
    <button
      bind:this={toolsCloseButton}
      type="button"
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      aria-label="Close adventure tools"
      onclick={onClose}
    >
      <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>
  {#if phone}
    <div
      class="mb-4 space-y-2 border-b border-theme-border pb-4"
      data-testid="adventure-tools-mobile-controls"
    >
      {@render controls(true)}
      {@render fullscreenControl(true)}
      {@render management(true)}
    </div>
  {/if}
  <div class="space-y-4">
    {#if artwork.flagEnabled}
      <ArtworkSettings preferences={artworkPreferences} />
      <AdventureArtworkCueDetails summary={artwork.cueSummary} />
    {/if}
    <AdventurePackageProgress {manager} />
    <AdventurePackageAudit {manager} />
    <AdventureSituationSettings {manager} onAction={onClose} />
    <AdventureCorrectionForm {manager} />
    <AdventureRollHistory {manager} />
    <AdventureResourceCounters {manager} />
    <AdventureArchive
      {repository}
      {vaultId}
      {onResume}
      {onResumeArchived}
      listEntries={listAdventureSessions}
    />
  </div>
</aside>
