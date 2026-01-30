<script lang="ts">
    import { helpStore } from "$stores/help.svelte";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import GuideTooltip from "./GuideTooltip.svelte";

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

    // Derived values for the mask
    const isDisabled = $derived.by(() => {
        if (typeof window === "undefined") return false;
        return (window as any).DISABLE_ONBOARDING;
    });

    let maskStyle = $derived.by(() => {
        if (!targetRect) return "";
        
        const padding = 8;
        const x = targetRect.left - padding;
        const y = targetRect.top - padding;
        const w = targetRect.width + padding * 2;
        const h = targetRect.height + padding * 2;

        // Clamp spotlight rectangle to viewport bounds
        const viewportWidth =
            typeof window !== "undefined"
                ? window.innerWidth || document.documentElement.clientWidth
                : 0;
        const viewportHeight =
            typeof window !== "undefined"
                ? window.innerHeight || document.documentElement.clientHeight
                : 0;

        if (!viewportWidth || !viewportHeight) {
            return "";
        }

        const left = Math.max(0, x);
        const top = Math.max(0, y);
        const right = Math.min(viewportWidth, x + w);
        const bottom = Math.min(viewportHeight, y + h);

        // If clamping results in an invalid rectangle, skip the mask.
        if (right <= left || bottom <= top) {
            return "";
        }

        // SVG mask approach for maximum compatibility and sharpness
        return `clip-path: polygon(
            0% 0%, 
            0% 100%, 
            ${left}px 100%, 
            ${left}px ${top}px, 
            ${right}px ${top}px, 
            ${right}px ${bottom}px, 
            ${left}px ${bottom}px, 
            ${left}px 100%, 
            100% 100%, 
            100% 0%
        );`;
    });
</script>

{#if helpStore.activeTour && !isDisabled}
    <div
        class="fixed inset-0 z-[900] bg-black/60 backdrop-blur-[2px] transition-all duration-300"
        style={maskStyle}
        transition:fade
        role="presentation"
    ></div>

    {#if helpStore.currentStep}
        <GuideTooltip 
            step={helpStore.currentStep} 
            {targetRect} 
            isLast={helpStore.activeTour.currentStepIndex === helpStore.activeTour.steps.length - 1}
            current={helpStore.activeTour.currentStepIndex + 1}
            total={helpStore.activeTour.steps.length}
        />
    {/if}
{/if}

<style>
</style>
