<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import { base } from '$app/paths';
    import { uiStore } from '$lib/stores/ui.svelte';
    import { PATREON_URL } from '$lib/config';
    import VaultControls from '$lib/components/VaultControls.svelte';

    let { isOpen = $bindable(false) } = $props();

    let closeButton = $state<HTMLButtonElement | null>(null);
    let lastFocusedElement = $state<HTMLElement | null>(null);

    const close = () => {
        isOpen = false;
    };

    // Accessibility: Focus management
    $effect(() => {
        if (isOpen) {
            lastFocusedElement = document.activeElement as HTMLElement;
            // Wait for transition/render
            setTimeout(() => {
                closeButton?.focus();
            }, 50);
        } else if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    });

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            close();
        }
    };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
        transition:fade={{ duration: 200 }}
        onclick={close}
        role="presentation"
    ></div>

    <!-- Drawer -->
    <div 
        class="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-theme-surface border-r border-theme-border z-[70] flex flex-col shadow-2xl"
        transition:fly={{ x: -300, duration: 300 }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
    >
        <!-- Header -->
        <div class="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
            <h2 class="text-lg font-bold text-theme-text font-mono flex items-center gap-2">
                <span class="icon-[lucide--menu] text-theme-primary"></span>
                MENU
            </h2>
            <button 
                bind:this={closeButton}
                onclick={close}
                class="p-2 text-theme-muted hover:text-theme-primary transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary rounded"
                aria-label="Close menu"
            >
                <span class="icon-[heroicons--x-mark] w-6 h-6"></span>
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            
            <!-- Main Controls -->
            <div class="flex flex-col gap-2">
                <h3 class="text-xs font-bold text-theme-muted uppercase tracking-widest mb-2">Campaign Controls</h3>
                <VaultControls orientation="vertical" />
            </div>

            <!-- Application Settings -->
            <div class="flex flex-col gap-2">
                <h3 class="text-xs font-bold text-theme-muted uppercase tracking-widest mb-2">Application</h3>
                <button
                    class="flex items-center gap-3 p-3 rounded border border-theme-border hover:border-theme-primary hover:bg-theme-primary/10 transition-all text-left group focus:outline-none focus:ring-2 focus:ring-theme-primary"
                    onclick={() => {
                        uiStore.toggleSettings("vault");
                        close();
                    }}
                >
                    <span class="icon-[lucide--settings] w-5 h-5 text-theme-muted group-hover:text-theme-primary"></span>
                    <span class="font-mono text-sm font-bold text-theme-text group-hover:text-theme-primary">Settings</span>
                </button>
            </div>

            <!-- Links -->
            <div class="flex flex-col gap-2 mt-auto">
                <h3 class="text-xs font-bold text-theme-muted uppercase tracking-widest mb-2">Links</h3>
                {#if PATREON_URL}
                    <a
                        href={PATREON_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-3 p-2 text-sm font-mono text-theme-secondary hover:text-theme-primary transition-colors focus:outline-none focus:ring-1 focus:ring-theme-primary rounded"
                    >
                        <span class="icon-[lucide--heart] w-4 h-4"></span>
                        Support on Patreon
                    </a>
                {/if}
                <a
                    href="{base}/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-3 p-2 text-sm font-mono text-theme-secondary hover:text-theme-primary transition-colors focus:outline-none focus:ring-1 focus:ring-theme-primary rounded"
                >
                    <span class="icon-[lucide--shield] w-4 h-4"></span>
                    Privacy Policy
                </a>
                <a
                    href="{base}/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-3 p-2 text-sm font-mono text-theme-secondary hover:text-theme-primary transition-colors focus:outline-none focus:ring-1 focus:ring-theme-primary rounded"
                >
                    <span class="icon-[lucide--file-text] w-4 h-4"></span>
                    Terms of Service
                </a>
            </div>
        </div>
        
        <!-- Footer Info -->
        <div class="p-4 border-t border-theme-border bg-theme-bg/30">
             <div class="text-[10px] font-mono text-theme-muted uppercase tracking-widest text-center">
                Codex Cryptica
            </div>
        </div>
    </div>
{/if}