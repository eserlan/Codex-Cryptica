<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import type { AdventureFocusArtwork } from "./adventure-focus-artwork.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import AdventureStateSummary from "./AdventureStateSummary.svelte";
  import AdventureArtworkFeature from "./artwork/AdventureArtworkFeature.svelte";
  let {
    manager,
    artwork,
    variant = "strip",
    sceneDetailsMaxHeightPx,
  }: {
    manager: AdventureManager;
    artwork: AdventureFocusArtwork;
    variant?: "strip" | "panel";
    sceneDetailsMaxHeightPx?: number;
  } = $props();
</script>

{#if manager.session && manager.recap}
  {#if variant === "strip"}
    <!-- Narrow surfaces: the scene strip is pinned above the transcript. -->
    <div class="shrink-0 @4xl:hidden" data-testid="adventure-scene-strip-wrap">
      <AdventureStateSummary
        {manager}
        maxExpandedHeightPx={sceneDetailsMaxHeightPx}
      />
    </div>
  {:else}
    <aside
      aria-label="Current scene"
      data-testid="adventure-artwork-panel"
      class="adventure-scrollbar hidden @4xl:block @4xl:w-80 @4xl:shrink-0 @4xl:overflow-y-auto @4xl:border-r @4xl:border-theme-border @4xl:bg-theme-surface/40 @4xl:p-4 @6xl:w-96"
    >
      <AdventureStateSummary {manager} variant="panel">
        {#snippet media()}
          {#if artwork.flagEnabled}
            <AdventureArtworkFeature
              session={manager.session}
              entities={vault.entities}
              activeVaultId={vault.activeVaultId}
              resolve={(path) => vault.resolveImageUrl(path)}
              readOnly={manager.readOnly ||
                (manager.phase !== "ready" && manager.phase !== "offline")}
              theme={themeStore.worldThemeId}
              mutate={(...args) => manager.mutateLocalArtwork(...args)}
              portrait={artwork.portrait}
            />
          {/if}
        {/snippet}
      </AdventureStateSummary>
    </aside>
  {/if}
{/if}
