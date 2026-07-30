<script lang="ts">
  import { THEMES, type WorldThemeId } from "schema";
  import {
    generateStarterConstellationLocal,
    buildStarterConstellationPrompt,
    parseStarterConstellationResponse,
    STARTER_CONSTELLATION_THEME_IDS,
    type StarterConstellationResult,
  } from "generator-engine";
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { aiGeneratorGateway } from "$lib/services/generators/ai-generator-gateway";
  import { graph } from "$lib/stores/graph.svelte";

  let { onClose } = $props<{ onClose: () => void }>();

  const themeOptions = STARTER_CONSTELLATION_THEME_IDS.filter(
    (id) => id in THEMES,
  ).map((id) => ({ id, name: THEMES[id as WorldThemeId].name }));

  let themeId = $state<string>(themeOptions[0]?.id ?? "fantasy");
  let premise = $state("");
  let isGenerating = $state(false);
  let errorMsg = $state<string | null>(null);

  const aiAvailable = $derived(oracle.isEnabled && !vault.isGuest);

  async function generateResult(): Promise<StarterConstellationResult> {
    if (aiAvailable) {
      try {
        const prompt = buildStarterConstellationPrompt({
          themeId,
          premise,
          useAI: true,
        });
        const response = await aiGeneratorGateway.complete(
          prompt.userMessage,
          prompt.systemInstruction,
        );
        const text = typeof response === "string" ? response : response.text;
        return parseStarterConstellationResponse(text, { themeId, premise });
      } catch (err) {
        console.warn(
          "[QuickStartModal] AI starter constellation failed, falling back to local generation",
          err,
        );
      }
    }
    return generateStarterConstellationLocal({ themeId, premise });
  }

  // Don't let a backdrop click / Escape / close button unmount the modal
  // mid-generation — the async createVault + entity-creation loop keeps
  // running against the `vault` singleton after unmount, and a second
  // Quick Start run before it finishes could interleave into the wrong vault.
  function requestClose() {
    if (!isGenerating) onClose();
  }

  async function handleGenerate() {
    if (isGenerating) return;
    isGenerating = true;
    errorMsg = null;
    try {
      const result = await generateResult();

      const vaultName = result.title || `${themeId} World`;
      await vault.createVault(vaultName);
      await themeStore.setTheme(result.themeId);

      const idMap = new Map<string, string>();
      for (const entity of result.entities) {
        // Run the draft through the same revise pipeline used for AI-authored
        // content elsewhere (oracle.reviseNewEntityDraft), but skip the manual
        // diff-review step — Quick Start auto-approves the result. Falls back
        // to the raw generated draft as-is when AI is unavailable/guest, so
        // there's never a raw, unfilled template spliced into the entity.
        const revised = await oracle.reviseNewEntityDraft(
          entity.title,
          entity.type,
          { chronicle: entity.summary, lore: entity.content },
        );

        // "threat" isn't a vault category (schema's DEFAULT_CATEGORIES has no
        // such entry) — save it as an event so it gets a real icon/filter
        // entry. The generator already includes a "threat" label, so the
        // distinction isn't lost.
        const vaultType = entity.type === "threat" ? "event" : entity.type;

        const realId = await vault.createEntity(vaultType, entity.title, {
          labels: entity.labels,
          content: revised.content,
          lore: revised.lore,
        });
        idMap.set(entity.id, realId);
      }

      for (const rel of result.relationships) {
        const sourceId = idMap.get(rel.sourceId);
        const targetId = idMap.get(rel.targetId);
        if (!sourceId || !targetId) continue;
        // A single connection already renders as one edge linking both
        // entities in the graph — adding the reverse direction too (even
        // under the same label) draws a second, backwards-reading edge
        // (e.g. "Region located in Settlement"), not a "bidirectional" link.
        await vault.addConnection(sourceId, targetId, rel.relation);
      }

      const firstEntityId = result.entities[0]
        ? idMap.get(result.entities[0].id)
        : undefined;
      if (firstEntityId) {
        vault.selectedEntityId = firstEntityId;
      }

      // Entities/connections were all added incrementally — the graph's
      // incremental sync doesn't re-layout for edges added to already-synced
      // nodes, so without this the new constellation piles up on one spot.
      graph.requestLayout();

      notificationStore.notify(
        `Generated "${vaultName}" with ${result.entities.length} entities`,
        "success",
      );
      onClose();
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      isGenerating = false;
    }
  }
</script>

<ModalShell
  open={true}
  onClose={requestClose}
  labelledBy="quick-start-title"
  backdropClass="bg-black/60 backdrop-blur-md"
  zIndexClass="z-[110]"
  class="bg-theme-surface border border-theme-border rounded-xl"
  maxWidthClass="max-w-lg"
>
  <div data-testid="quick-start-modal" class="contents">
    <div
      class="p-4 border-b border-theme-border flex items-center justify-between"
    >
      <h2
        id="quick-start-title"
        class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
      >
        Quick Start World
      </h2>
      <button
        type="button"
        onclick={requestClose}
        disabled={isGenerating}
        class="p-1.5 rounded-lg hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors disabled:opacity-50"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] w-4 h-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="p-4 space-y-4">
      <div>
        <label
          for="quick-start-theme"
          class="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5"
        >
          Theme
        </label>
        <select
          id="quick-start-theme"
          bind:value={themeId}
          class="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
        >
          {#each themeOptions as option (option.id)}
            <option value={option.id}>{option.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label
          for="quick-start-premise"
          class="block text-xs font-bold uppercase tracking-wider text-theme-muted mb-1.5"
        >
          Seed Premise (optional)
        </label>
        <textarea
          id="quick-start-premise"
          bind:value={premise}
          rows="4"
          placeholder="e.g. Corporation hijacking the net grid"
          class="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary resize-none"
        ></textarea>
      </div>

      {#if errorMsg}
        <p
          class="rounded border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400"
        >
          {errorMsg}
        </p>
      {/if}

      <button
        type="button"
        onclick={handleGenerate}
        disabled={isGenerating}
        data-testid="quick-start-generate"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-theme-primary text-theme-bg font-bold text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
      >
        {#if isGenerating}
          <span
            class="icon-[lucide--loader-2] w-4 h-4 animate-spin"
            aria-hidden="true"
          ></span>
          Generating...
        {:else}
          <span class="icon-[lucide--sparkles] w-4 h-4" aria-hidden="true"
          ></span>
          Generate Starter World
        {/if}
      </button>
    </div>
  </div>
</ModalShell>
