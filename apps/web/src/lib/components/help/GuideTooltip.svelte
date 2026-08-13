<script lang="ts">
  import { helpStore } from "$lib/stores/help.svelte";
  import { fly } from "svelte/transition";
  import { renderMarkdown } from "$lib/utils/markdown";
  import type { GuideStep } from "$lib/config/help-content";

  let { step, targetRect, isLast, current, total } = $props<{
    step: GuideStep;
    targetRect: DOMRect | null;
    isLast: boolean;
    current: number;
    total: number;
  }>();

  // ⚡ Bolt Optimization: Memoize expensive markdown parsing and sanitization.
  // Previously, this ran inline on every template evaluation (e.g., when tooltipStyle updated).
  // Using $derived.by ensures it only recomputes when step.content actually changes.
  const parsedContent = $derived.by(() => renderMarkdown(step.content));

  // Real rendered size, measured after each step's content paints. Content
  // length varies a lot per step/device (e.g. a 4-line body on a narrow
  // mobile width), so a fixed size guess can under-reserve space and let the
  // box overflow the viewport even though the position math "clamped" it —
  // the clamp was only ever as accurate as the guess. Falls back to a rough
  // estimate for the very first paint, before measurement completes.
  let tooltipEl = $state<HTMLElement | undefined>();
  let measuredSize = $state<{ width: number; height: number } | null>(null);

  $effect(() => {
    // Re-measure whenever the step changes (title/content length differs).
    void step;
    measuredSize = null;
    let raf: number | undefined;
    if (typeof requestAnimationFrame !== "undefined") {
      raf = requestAnimationFrame(() => {
        if (tooltipEl) {
          const rect = tooltipEl.getBoundingClientRect();
          measuredSize = { width: rect.width, height: rect.height };
        }
      });
    }
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  });

  let tooltipStyle = $derived.by(() => {
    if (!targetRect || step.targetSelector === "body") {
      // Center of screen
      return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
    }

    const padding = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If target is massive (like the canvas), treat it like "body" but dimmed
    if (targetRect.width > vw * 0.8 && targetRect.height > vh * 0.8) {
      return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
    }

    const estimatedWidth = measuredSize?.width ?? 350;
    const estimatedHeight = measuredSize?.height ?? 200;

    // Pick whichever side actually has room, rather than trusting the step's
    // authored `position` unconditionally. A step's "right" makes sense for a
    // vertical desktop rail icon, but the same target can be a horizontal
    // bottom-bar icon on mobile — there's no meaningful "right" of an icon
    // packed in a row near the screen edge, and forcing it there just pushes
    // the box off whichever edge is actually short on space.
    const spaceTop = targetRect.top;
    const spaceBottom = vh - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = vw - targetRect.right;

    const fits: Record<typeof step.position, boolean> = {
      top: spaceTop >= estimatedHeight + padding,
      bottom: spaceBottom >= estimatedHeight + padding,
      left: spaceLeft >= estimatedWidth + padding,
      right: spaceRight >= estimatedWidth + padding,
    };

    let pos = step.position;
    if (!fits[pos]) {
      const bySpace: Array<[typeof step.position, number]> = [
        ["top", spaceTop],
        ["bottom", spaceBottom],
        ["left", spaceLeft],
        ["right", spaceRight],
      ];
      bySpace.sort((a, b) => b[1] - a[1]);
      pos = bySpace[0][0];
    }

    // Compute the tooltip's actual rendered top-left corner directly, rather
    // than a pre-transform anchor point paired with a CSS `transform` for
    // centering/flipping. The safety clamp below needs to operate on real
    // render coordinates — clamping a pre-transform value doesn't stop a
    // `translateY(-50%)`/`translate(-100%, -50%)` shift from still pushing
    // the box off-screen for a target near a viewport edge.
    let top: number;
    let left: number;

    switch (pos) {
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - estimatedWidth / 2;
        break;
      case "top":
        top = targetRect.top - padding - estimatedHeight;
        left = targetRect.left + targetRect.width / 2 - estimatedWidth / 2;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
        left = targetRect.left - padding - estimatedWidth;
        break;
      case "right":
      default:
        top = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
        left = targetRect.right + padding;
        break;
    }

    // Final safety clamp — now consistent with the coordinates actually drawn,
    // and using the same (measured, when available) size as the fit check.
    top = Math.max(padding, Math.min(vh - estimatedHeight - padding, top));
    left = Math.max(padding, Math.min(vw - estimatedWidth - padding, left));

    return `top: ${top}px; left: ${left}px;`;
  });
</script>

<div
  bind:this={tooltipEl}
  data-testid="tour-tooltip"
  class="fixed z-[var(--z-index-overlay-tooltip,152)] w-72 md:w-96 bg-theme-surface border border-theme-primary/50 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.2)] rounded-lg flex flex-col overflow-hidden font-mono"
  style="{tooltipStyle} box-shadow: var(--theme-glow);"
  transition:fly={{ y: 10, duration: 300 }}
>
  <!-- Header -->
  <div
    class="px-4 py-3 border-b border-theme-border/30 flex justify-between items-center bg-theme-primary/5"
  >
    <span
      class="text-[10px] text-theme-primary font-bold tracking-[0.2em] uppercase font-header"
    >
      Guide {current} of {total}
    </span>
    <button
      type="button"
      onclick={() => helpStore.skipTour()}
      class="text-theme-muted hover:text-theme-primary transition-colors"
      title="Skip Tour"
      aria-label="Skip Tour"
    >
      <span aria-hidden="true" class="icon-[lucide--x] w-4 h-4"></span>
    </button>
  </div>

  <!-- Content -->
  <div class="p-5">
    <h3
      class="text-theme-primary text-sm font-bold mb-2 uppercase font-header tracking-wider"
    >
      {step.title}
    </h3>
    <div
      class="text-theme-text/80 text-xs leading-relaxed prose prose-invert prose-p:my-1 prose-strong:text-theme-primary prose-code:text-theme-secondary"
    >
      {@html parsedContent}
    </div>
  </div>

  <!-- Footer -->
  <div
    class="px-4 py-3 bg-black/40 flex justify-between gap-3 border-t border-theme-border/20"
  >
    <button
      onclick={() => helpStore.skipTour()}
      class="text-[10px] text-theme-muted hover:text-theme-primary uppercase font-bold font-header tracking-widest transition-colors"
      aria-label="Dismiss tour"
    >
      Dismiss
    </button>

    <div class="flex gap-2">
      {#if current > 1}
        <button
          onclick={() => helpStore.prevStep()}
          class="px-3 py-1 border border-theme-border/50 text-theme-primary hover:bg-theme-primary/10 text-[10px] uppercase font-bold font-header transition-all"
          aria-label="Go to previous step"
        >
          Back
        </button>
      {/if}
      <button
        onclick={() => helpStore.nextStep()}
        class="px-4 py-1 bg-theme-primary hover:bg-theme-secondary text-theme-bg text-[10px] uppercase font-bold font-header transition-all"
        aria-label={isLast ? "Finish tour" : "Go to next step"}
      >
        {isLast ? "Finish" : "Next"}
      </button>
    </div>
  </div>

  <!-- Decorative Corner -->
  <div
    class="absolute -top-px -left-px w-2 h-2 border-t border-l border-theme-primary"
  ></div>
  <div
    class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-theme-primary"
  ></div>
</div>
