<script lang="ts">
    import { oracle } from "$lib/stores/oracle.svelte";
    import { uiStore } from "$stores/ui.svelte";
    import ChatMessage from "./ChatMessage.svelte";
    import { fade } from "svelte/transition";
    import { tick } from "svelte";

    let { onOpenSettings } = $props<{ onOpenSettings?: () => void }>();

    let input = $state("");
    let scrollContainer = $state<HTMLDivElement>();

    const handleSubmit = async () => {
        if (!input || oracle.isLoading) return;
        const query = input;
        input = "";
        await oracle.ask(query);
    };

    $effect(() => {
        if (oracle.messages.length && scrollContainer) {
            tick().then(() => {
                scrollContainer?.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: "smooth",
                });
            });
        }
    });
</script>

{#if !oracle.isEnabled}
    <div
        class="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4"
    >
        <div
            class="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center text-purple-500 mb-2"
        >
            <span class="icon-[heroicons--sparkles] w-8 h-8"></span>
        </div>
        <h3 class="text-purple-100 font-bold uppercase tracking-widest text-xs">
            Oracle Offline
        </h3>
        <p class="text-xs text-purple-300/70 leading-relaxed">
            To consult the archives, please provide a <strong
                >Google Gemini API Key</strong
            > in the Settings panel.
        </p>

        <button
            class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded-full text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-900/40"
            onclick={() => {
                if (onOpenSettings) onOpenSettings();
                else uiStore.openSettings();
            }}
        >
            OPEN SETTINGS
        </button>
        <div class="flex flex-col gap-2 w-full pt-4">
            <p class="text-[10px] text-purple-500 font-mono">
                Vault contents never leave this device except for inference via
                your own API key.
            </p>
        </div>
    </div>
{:else}
    <!-- Messages -->
    <div
        class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        bind:this={scrollContainer}
    >
        {#if oracle.messages.length === 0}
            <div
                class="h-full flex flex-col items-center justify-center text-center p-8 space-y-6"
            >
                <div class="relative">
                    <div
                        class="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"
                    ></div>
                    <span
                        class="icon-[heroicons--sparkles] w-12 h-12 text-purple-500 relative z-10 opacity-50"
                    ></span>
                </div>

                <div class="space-y-2">
                    <h4
                        class="text-purple-100 font-bold uppercase tracking-[0.2em] text-[10px]"
                    >
                        The Archives are Open
                    </h4>
                    <p
                        class="text-xs text-purple-400/60 leading-relaxed font-mono"
                    >
                        Greetings, Seeker. I am the Oracle, the keeper of your
                        recorded lore. Ask of the robber, the mayor, or the
                        shadows beyond the village... I shall consult the echoes
                        of your vault.
                    </p>
                </div>

                <div class="pt-4">
                    <p
                        class="text-[9px] text-purple-900/40 uppercase tracking-widest animate-bounce"
                    >
                        Awaiting your query...
                    </p>
                </div>
            </div>
        {/if}

        {#each oracle.messages as msg}
            <ChatMessage message={msg} />
        {/each}

        {#if oracle.isLoading}
            <div class="flex justify-start" transition:fade>
                <div
                    class="bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded text-xs text-purple-400 font-mono animate-pulse"
                >
                    Consulting archives...
                </div>
            </div>
        {/if}
    </div>

    <!-- Input -->
    <div class="p-4 border-t border-purple-900/30 bg-purple-900/5 shrink-0">
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleSubmit();
            }}
            class="flex gap-2"
        >
            <input
                bind:value={input}
                placeholder="Ask the archives..."
                class="flex-1 bg-black/40 border border-purple-900/40 rounded px-4 py-2.5 text-sm text-purple-100 placeholder-purple-900/50 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 transition-all font-mono"
                disabled={oracle.isLoading}
            />
            <button
                type="submit"
                class="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-black rounded transition shadow-lg shadow-purple-900/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                disabled={!input.trim() || oracle.isLoading}
            >
                ➤
            </button>
        </form>
    </div>
{/if}
