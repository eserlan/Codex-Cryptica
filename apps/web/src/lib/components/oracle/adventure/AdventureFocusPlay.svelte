<script lang="ts">
  import AdventureFocusControls from "./AdventureFocusControls.svelte";
  import AdventureFocusFullscreenButton from "./AdventureFocusFullscreenButton.svelte";
  import AdventureFocusHeader from "./AdventureFocusHeader.svelte";
  import AdventureFocusTools from "./AdventureFocusTools.svelte";
  import "./adventure-focus-scrollbar.css";
  import { bodyPortal, containTab } from "./adventure-phone-surface";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { AdventureSessionRepository } from "#lib/services/adventure/adventure-session-repository.js";
  import type { ProvisionalFact } from "@codex/adventure-engine";
  import { AdventureFocusCompletion } from "./adventure-focus-completion.svelte.js";
  import AdventureManagementMenu from "./AdventureManagementMenu.svelte";
  import AdventureArtworkLightbox from "./artwork/AdventureArtworkLightbox.svelte";
  import {
    AdventureLightboxController,
    setAdventureLightbox,
  } from "./artwork/adventure-artwork-lightbox.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { AdventureFocusArtwork } from "./adventure-focus-artwork.svelte.js";
  import AdventureFocusStory from "./AdventureFocusStory.svelte";
  import AdventureFocusScene from "./AdventureFocusScene.svelte";
  import { AdventureFocusViewport } from "./adventure-focus-viewport.svelte.js";
  import { AdventureFocusToolsState } from "./adventure-focus-tools.svelte.js";

  let {
    manager,
    existingTitles,
    onAddProvisionalFact,
    onAddAllProvisionalFacts,
    repository,
    vaultId,
    onResume,
    onResumeArchived,
  }: {
    manager: AdventureManager;
    existingTitles: string[];
    onAddProvisionalFact: (fact: ProvisionalFact) => Promise<void>;
    onAddAllProvisionalFacts?: (facts: ProvisionalFact[]) => Promise<void>;
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume: (sessionId: string) => Promise<void>;
    onResumeArchived: (sessionId: string) => Promise<void>;
  } = $props();

  const viewport = new AdventureFocusViewport();
  const tools = new AdventureFocusToolsState(() => repository);
  const phone = $derived(viewport.phone);
  const focusElement = $derived(viewport.element);
  const artworkLightbox = setAdventureLightbox(
    new AdventureLightboxController(),
  );
  const completion = new AdventureFocusCompletion(
    () => manager,
    () => viewport.focusComposer(),
  );
  const pendingCompletion = $derived(completion.pending);
  const adventureTitle = $derived(manager.session?.title ?? "Adventure");
  const artwork = new AdventureFocusArtwork(() => ({
    session: manager.session,
    activeVaultId: vault.activeVaultId,
    entities: vault.entities,
    theme: themeStore.worldThemeId,
  }));
  function handleSurfaceKeydown(event: KeyboardEvent): void {
    if (
      pendingCompletion &&
      event.key === "Escape" &&
      !event.defaultPrevented &&
      !completion.busy &&
      !tools.open &&
      !viewport.hasNestedModal()
    ) {
      event.preventDefault();
      event.stopPropagation();
      void completion.continueExploring(pendingCompletion.eventId);
      return;
    }
    if (phone && focusElement) containTab(event, focusElement);
  }
</script>

<svelte:document bind:fullscreenElement={viewport.fullscreenElement} />
<svelte:window
  onkeydown={(event) =>
    tools.handleKeydown(event, () => viewport.hasNestedModal())}
/>

{#snippet adventureControls(inToolsSheet: boolean)}
  <AdventureFocusControls
    {manager}
    {existingTitles}
    {onAddProvisionalFact}
    {onAddAllProvisionalFacts}
    {inToolsSheet}
    {focusElement}
    onAction={tools.close}
  />
{/snippet}

{#snippet fullscreenControl(inToolsSheet: boolean)}
  <AdventureFocusFullscreenButton
    {inToolsSheet}
    active={viewport.isFullscreen}
    busy={viewport.fullscreenTransitioning}
    onToggle={viewport.toggleFullscreen}
  />
{/snippet}

{#snippet management(inToolsSheet: boolean)}
  <AdventureManagementMenu
    variant={inToolsSheet ? "inline" : "menu"}
    {manager}
    {repository}
    {vaultId}
    listEntries={tools.list}
    onSwitch={onResume}
    onAction={inToolsSheet ? tools.close : tools.invalidate}
  />
{/snippet}

<section
  bind:this={viewport.element}
  use:bodyPortal={phone}
  class="@container fixed inset-0 z-[100] flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-theme-bg sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:min-h-[65vh] sm:flex-1"
  style={viewport.keyboardStyle}
  role={phone ? "dialog" : undefined}
  aria-modal={phone ? "true" : undefined}
  aria-labelledby="adventure-heading"
  data-testid="adventure-play-surface"
  onkeydown={handleSurfaceKeydown}
>
  <AdventureFocusHeader
    {manager}
    {existingTitles}
    {phone}
    {adventureTitle}
    toolsOpen={tools.open}
    bind:toolsButton={tools.button}
    onToggleTools={tools.toggle}
    controls={adventureControls}
    {fullscreenControl}
    {management}
  />

  <AdventureFocusScene
    {manager}
    {artwork}
    sceneDetailsMaxHeightPx={viewport.sceneDetailsMaxHeightPx}
  />

  <div class="flex min-h-0 flex-1 flex-col @4xl:flex-row">
    <AdventureFocusScene {manager} {artwork} variant="panel" />
    <AdventureFocusStory
      {manager}
      {completion}
      {phone}
      {focusElement}
      keyboardOpen={viewport.keyboard.keyboardOpen}
    />
  </div>

  <!-- Portaled to <body> so the fixed lightbox always covers the viewport and
       never depends on the surface (a size container) as an ancestor. -->
  <div class="contents" use:bodyPortal={true}>
    <AdventureArtworkLightbox controller={artworkLightbox} />
  </div>

  <!-- No viewport breakpoints for side-by-side layout: this surface is often
       hosted in the app's own (already-narrow) sidebar panel, where a viewport
       breakpoint still fires. The scene panel uses a container query on the
       surface's own width; the tools stay a bottom sheet anchored to this
       section's bounds, correct however wide the host is. -->
  {#if tools.open}
    <AdventureFocusTools
      {manager}
      {repository}
      {vaultId}
      {onResume}
      {onResumeArchived}
      listAdventureSessions={tools.list}
      {phone}
      {adventureTitle}
      {artwork}
      bind:toolsCloseButton={tools.closeButton}
      onClose={tools.close}
      controls={adventureControls}
      {fullscreenControl}
      {management}
    />
  {/if}
</section>
