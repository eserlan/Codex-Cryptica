<script lang="ts">
    import { helpStore } from "$stores/help.svelte";
    import { fly } from "svelte/transition";
    import { marked } from "marked";
    import DOMPurify from "isomorphic-dompurify";
    import type { GuideStep } from "$lib/config/help-content";

    let { step, targetRect, isLast, current, total } = $props<{
        step: GuideStep;
        targetRect: DOMRect | null;
        isLast: boolean;
        current: number;
        total: number;
    }>();

    const parseContent = (content: string) => {
        try {
            return DOMPurify.sanitize(marked.parse(content) as string);
        } catch (e) {
            console.error("Failed to parse guide content", e);
            return content;
        }
    };

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

        let top = 0;
        let left = 0;
        let transform = "";

        // Determine best position
        let pos = step.position;
        if (pos === "bottom" && targetRect.bottom + 250 > vh) pos = "top";
        if (pos === "top" && targetRect.top - 250 < 0) pos = "bottom";

        switch (pos) {
            case "bottom":
                top = targetRect.bottom + padding;
                left = targetRect.left + targetRect.width / 2;
                transform = "translateX(-50%)";
                break;
            case "top":
                top = targetRect.top - padding;
                left = targetRect.left + targetRect.width / 2;
                transform = "translate(-50%, -100%)";
                break;
            case "left":
                top = targetRect.top + targetRect.height / 2;
                left = targetRect.left - padding;
                transform = "translate(-100%, -50%)";
                break;
            case "right":
                top = targetRect.top + targetRect.height / 2;
                left = targetRect.right + padding;
                transform = "translateY(-50%)";
                break;
        }

        // Final safety clamp
        const estimatedWidth = 350;
        const estimatedHeight = 200;
        
        top = Math.max(padding, Math.min(vh - estimatedHeight - padding, top));
        left = Math.max(estimatedWidth / 2 + padding, Math.min(vw - estimatedWidth / 2 - padding, left));

        return `top: ${top}px; left: ${left}px; transform: ${transform};`;
    });
</script>

<div
    class="fixed z-[82] w-72 md:w-96 bg-[#0c0c0c] border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)] rounded-lg flex flex-col overflow-hidden font-mono"
    style={tooltipStyle}
    transition:fly={{ y: 10, duration: 300 }}
>
    <!-- Header -->
    <div class="px-4 py-3 border-b border-green-900/30 flex justify-between items-center bg-green-900/5">
        <span class="text-[10px] text-green-500 font-bold tracking-[0.2em] uppercase">
            Guide {current} of {total}
        </span>
        <button 
            onclick={() => helpStore.skipTour()}
            class="text-green-900 hover:text-green-500 transition-colors"
            title="Skip Tour"
            aria-label="Skip Tour"
        >
            <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
    </div>

    <!-- Content -->
    <div class="p-5">
        <h3 class="text-green-400 text-sm font-bold mb-2 uppercase tracking-wider">{step.title}</h3>
        <div class="text-green-100/80 text-xs leading-relaxed prose prose-invert prose-p:my-1 prose-strong:text-green-400 prose-code:text-green-300">
            {@html parseContent(step.content)}
        </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 bg-black/40 flex justify-between gap-3 border-t border-green-900/20">
        <button 
            onclick={() => helpStore.skipTour()}
            class="text-[10px] text-green-900 hover:text-green-700 uppercase font-bold tracking-widest transition-colors"
            aria-label="Dismiss tour"
        >
            Dismiss
        </button>
        
        <div class="flex gap-2">
            {#if current > 1}
                <button 
                    onclick={() => helpStore.prevStep()}
                    class="px-3 py-1 border border-green-900/50 text-green-500 hover:bg-green-900/20 text-[10px] uppercase font-bold transition-all"
                    aria-label="Go to previous step"
                >
                    Back
                </button>
            {/if}
            <button 
                onclick={() => helpStore.nextStep()}
                class="px-4 py-1 bg-green-600 hover:bg-green-500 text-black text-[10px] uppercase font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                aria-label={isLast ? "Finish tour" : "Go to next step"}
            >
                {isLast ? "Finish" : "Next"}
            </button>
        </div>
    </div>

    <!-- Decorative Corner -->
    <div class="absolute -top-px -left-px w-2 h-2 border-t border-l border-green-500"></div>
    <div class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-green-500"></div>
</div>
