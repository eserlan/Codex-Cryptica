<script lang="ts">
  import { helpStore } from "$lib/stores/help.svelte";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import GuideTooltip from "./GuideTooltip.svelte";
  import { computeSpotlightClipPath } from "$lib/utils/spotlight";

  let targetRect = $state<DOMRect | null>(null);

  // Update the spotlight position whenever the active step changes
  $effect(() => {
    const step = helpStore.currentStep;
    if (step && step.targetSelector !== "body") {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        targetRect = el.getBoundingClientRect();
        // Ensure the element is visible
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        targetRect = null;
      }
    } else {
      targetRect = null;
    }
  });

  const handleResize = () => {
    const step = helpStore.currentStep;
    if (step && step.targetSelector !== "body") {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        targetRect = el.getBoundingClientRect();
      }
    }
  };

  onMount(() => {
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      window.removeEventListener("keydown", handleKeydown);
    };
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (!helpStore.activeTour) return;

    if (e.key === "Escape") {
      helpStore.skipTour();
    } else if (e.key === "ArrowRight") {
      helpStore.nextStep();
    } else if (e.key === "ArrowLeft") {
      helpStore.prevStep();
    }
  };

  let maskStyle = $derived.by(() => {
    if (!targetRect) return "";

    const viewportWidth =
      typeof window !== "undefined"
        ? window.innerWidth || document.documentElement.clientWidth
        : 0;
    const viewportHeight =
      typeof window !== "undefined"
        ? window.innerHeight || document.documentElement.clientHeight
        : 0;

    return computeSpotlightClipPath(
      targetRect,
      viewportWidth,
      viewportHeight,
      8,
    );
  });
</script>

{#if helpStore.activeTour}
  {#if targetRect}
    <div
      class="fixed inset-0 z-[var(--z-index-overlay-max,150)] bg-black/60 backdrop-blur-[2px] transition-all duration-300"
      style={maskStyle}
      transition:fade
      role="presentation"
    ></div>
  {/if}

  {#if helpStore.currentStep}
    <GuideTooltip
      step={helpStore.currentStep}
      {targetRect}
      isLast={helpStore.activeTour.currentStepIndex ===
        helpStore.activeTour.steps.length - 1}
      current={helpStore.activeTour.currentStepIndex + 1}
      total={helpStore.activeTour.steps.length}
    />
  {/if}
{/if}

<style>
</style>
