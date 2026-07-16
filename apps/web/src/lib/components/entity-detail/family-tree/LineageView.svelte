<script lang="ts">
  import type { Entity } from "schema";
  import { untrack } from "svelte";
  import { buildLineage, layoutLineage } from "@codex/family-engine";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import FamilyMemberCard from "./FamilyMemberCard.svelte";
  import PanZoomContainer from "./PanZoomContainer.svelte";
  import { PanZoomState } from "./pan-zoom.svelte";

  let { focusId, entities, onOpen, onRecenter } = $props<{
    focusId: string;
    entities: Record<string, Entity>;
    onOpen: (id: string) => void;
    onRecenter: (id: string) => void;
  }>();

  const CARD_WIDTH = 112;
  const CARD_HEIGHT = 96;
  const H_GAP = 16;
  const V_GAP = 48;
  const INITIAL_CAP = 3;
  const EXPANDER_STEP = 3;

  let capUp = $state<number | undefined>(INITIAL_CAP);
  let capDown = $state<number | undefined>(INITIAL_CAP);
  let expandedBranches = $state<Set<string> | "all">(new Set());
  let busy = $state(false);
  let containerEl = $state<HTMLDivElement>();
  const panZoom = new PanZoomState(() =>
    containerEl
      ? { width: containerEl.clientWidth, height: containerEl.clientHeight }
      : { width: 0, height: 0 },
  );

  // Fresh view whenever the focus changes (re-centre): reset caps/branches
  // and re-frame the camera. Branch/cap changes alone do NOT re-frame, so
  // expanding while panned/zoomed in doesn't reset the user's camera (FR-010).
  $effect(() => {
    if (!focusId) return;
    capUp = INITIAL_CAP;
    capDown = INITIAL_CAP;
    expandedBranches = new Set();
    untrack(() => panZoom.fitTo(positioned.bounds));
  });

  const lineage = $derived(
    buildLineage(focusId, entities, {
      maxUp: capUp,
      maxDown: capDown,
      expandedBranches,
    }),
  );
  const positioned = $derived(
    layoutLineage(lineage, {
      cardWidth: CARD_WIDTH,
      cardHeight: CARD_HEIGHT,
      hGap: H_GAP,
      vGap: V_GAP,
    }),
  );
  const offsetX = $derived(
    -Math.min(0, ...positioned.cards.map((c) => c.x), 0),
  );
  const isEmpty = $derived(
    lineage.members.size === 1 && lineage.siblingBranches.size === 0,
  );
  const focusMember = $derived(lineage.members.get(lineage.focusId)!);

  function toggleBranch(rootId: string) {
    if (expandedBranches === "all") {
      expandedBranches = new Set(
        [...lineage.siblingBranches.keys()].filter((id) => id !== rootId),
      );
      return;
    }
    const next = new Set(expandedBranches);
    if (next.has(rootId)) next.delete(rootId);
    else next.add(rootId);
    expandedBranches = next;
  }

  function expandUp() {
    capUp = (capUp ?? INITIAL_CAP) + EXPANDER_STEP;
  }
  function expandDown() {
    capDown = (capDown ?? INITIAL_CAP) + EXPANDER_STEP;
  }

  async function expandAllGenerations() {
    busy = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    capUp = undefined;
    capDown = undefined;
    expandedBranches = "all";
    await new Promise((resolve) => setTimeout(resolve, 0));
    busy = false;
  }

  function isBranchExpanded(rootId: string): boolean {
    return expandedBranches === "all" || expandedBranches.has(rootId);
  }
</script>

{#if isEmpty}
  <div
    data-testid="lineage-empty"
    class="flex flex-col items-center gap-3 py-4 text-center"
  >
    <FamilyMemberCard member={focusMember} isFocus />
    <p class="max-w-xs text-xs text-theme-muted">
      No lineage recorded yet. Add parents, a partner, siblings, or children
      from the Family tab to build {focusMember.name}'s lineage.
    </p>
  </div>
{:else}
  <div class="pb-2">
    <FeatureHint hintId="lineage-controls" />
  </div>
  <div class="flex items-center justify-end gap-2 pb-2">
    <button
      type="button"
      data-testid="lineage-expand-all"
      class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={expandAllGenerations}
    >
      Show all generations
    </button>
  </div>

  <div
    data-testid="lineage-canvas"
    aria-busy={busy}
    data-debug-expanded-size={expandedBranches === "all"
      ? -1
      : expandedBranches.size}
    data-debug-cards={positioned.cards.length}
    class="relative w-full flex-1 overflow-hidden"
  >
    <!--
      touch-action: none prevents the browser's own touch-scroll/zoom from
      fighting our pointer-driven pan/pinch (FR-014); overflow: hidden keeps
      an oversized dynasty from ever pushing the page into horizontal scroll.
    -->
    <PanZoomContainer
      {panZoom}
      onElement={(element) => (containerEl = element)}
    >
      <div
        class="relative"
        style="width:{positioned.bounds.width}px; height:{positioned.bounds
          .height}px; transform-origin: 0 0; transform: translate({panZoom
          .viewport.pan.x}px, {panZoom.viewport.pan.y}px) scale({panZoom
          .viewport.zoom});"
      >
        <svg
          class="pointer-events-none absolute left-0 top-0"
          width={positioned.bounds.width}
          height={positioned.bounds.height}
          aria-hidden="true"
        >
          {#each positioned.edges as e (e.edge.from + "->" + e.edge.to)}
            <polyline
              points={e.points.map((p) => `${p.x + offsetX},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--color-theme-border, #94a3b8)"
              stroke-width="1"
              stroke-dasharray={e.edge.secondary ? "3 3" : undefined}
            />
          {/each}
        </svg>

        {#each positioned.cards as card (card.id)}
          {@const member = lineage.members.get(card.id)}
          {#if member}
            <div
              data-testid="lineage-card-{card.id}"
              class="absolute"
              style="left:{card.x + offsetX}px; top:{card.y}px;"
            >
              <FamilyMemberCard
                {member}
                isFocus={member.kind === "focus"}
                onSelect={() => onRecenter(card.id)}
                onOpen={() => onOpen(card.id)}
              />
              {#if lineage.siblingBranches.has(card.id)}
                {@const branch = lineage.siblingBranches.get(card.id)}
                <button
                  type="button"
                  data-testid="lineage-branch-toggle-{card.id}"
                  class="mt-1 w-full min-h-[44px] rounded border border-theme-border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
                  onclick={() => toggleBranch(card.id)}
                >
                  {isBranchExpanded(card.id)
                    ? "− Collapse"
                    : `⊞ ${branch?.hiddenCount ?? 0} hidden`}
                </button>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </PanZoomContainer>
  </div>

  <div class="flex items-center justify-center gap-2 pt-2">
    {#if lineage.truncatedUp}
      <button
        type="button"
        data-testid="lineage-expander-up"
        class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={expandUp}
      >
        {lineage.truncatedUp.hiddenGenerations} more generations above
      </button>
    {/if}
    {#if lineage.truncatedDown}
      <button
        type="button"
        data-testid="lineage-expander-down"
        class="rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={expandDown}
      >
        {lineage.truncatedDown.hiddenGenerations} more generations below
      </button>
    {/if}
  </div>
{/if}
