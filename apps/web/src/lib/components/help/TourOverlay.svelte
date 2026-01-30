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
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    });

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
        const r = 8; // rounded corners for the spotlight

        // SVG mask approach for maximum compatibility and sharpness
        return `clip-path: polygon(
            0% 0%, 
            0% 100%, 
            ${x}px 100%, 
            ${x}px ${y}px, 
            ${x + w}px ${y}px, 
            ${x + w}px ${y + h}px, 
            ${x}px ${y + h}px, 
            ${x}px 100%, 
            100% 100%, 
            100% 0%
        );`;
    });
</script>

{#if helpStore.activeTour && !isDisabled}
    <div
        class="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px] transition-all duration-300"
        style="pointer-events: none; {maskStyle}"
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
    /* Ensure the target element is "above" everything else conceptually, 
       even though we are using a mask on the overlay */
    :global(.tour-highlight) {
        position: relative;
        z-index: 201 !important;
        pointer-events: none;
    }
</style>
