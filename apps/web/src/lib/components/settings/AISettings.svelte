<script lang="ts">
    import { oracle } from "$lib/stores/oracle.svelte";
    import { onMount } from "svelte";

    let inputKey = $state("");
    let showKey = $state(false);

    onMount(() => {
        oracle.init();
    });

    const handleSave = async () => {
        if (inputKey.trim()) {
            await oracle.setKey(inputKey.trim());
            inputKey = "";
        }
    };

    const handleClear = async () => {
        if (
            confirm(
                "Are you sure you want to disable the Oracle and delete the API key from this device?",
            )
        ) {
            await oracle.clearKey();
        }
    };
</script>

<div class="p-4 border border-purple-900/30 rounded-lg bg-black/40 mt-4">
    <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
            <div
                class="w-2 h-2 bg-purple-500 rounded-full {oracle.isEnabled
                    ? 'animate-pulse'
                    : 'opacity-30'}"
            ></div>
            <h3
                class="font-semibold text-purple-100 uppercase tracking-wider text-xs"
            >
                Lore Oracle (Gemini AI)
            </h3>
        </div>

        {#if oracle.isEnabled}
            <button
                onclick={handleClear}
                class="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-tighter"
            >
                Disable & Clear Key
            </button>
        {/if}
    </div>

    <p class="text-xs text-purple-200/60 mb-4 leading-relaxed">
        Power your archives with Google Gemini. Choose between the <strong
            >Lite</strong
        >
        tier for efficiency or <strong>Advanced</strong> for complex reasoning.
    </p>

    <!-- Tier Selection -->
    <div class="mb-6 space-y-3">
        <span class="text-[10px] text-purple-400 uppercase font-bold block"
            >Oracle Intelligence Tier</span
        >
        <div class="grid grid-cols-2 gap-3">
            <button
                class="flex flex-col gap-1 p-3 rounded transition-all border text-left {oracle.tier ===
                'lite'
                    ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500/50'
                    : 'bg-black/40 border-purple-900/30 hover:border-purple-700'}"
                onclick={() => oracle.setTier("lite")}
            >
                <span class="text-[10px] font-bold tracking-widest uppercase {oracle.tier === 'lite' ? 'text-purple-100' : 'text-purple-400'}">Lite Tier</span>
                <span class="text-[9px] text-purple-300/60 leading-tight">Fast, efficient, and suitable for simple lore retrieval.</span>
            </button>
            <button
                class="flex flex-col gap-1 p-3 rounded transition-all border text-left {oracle.tier ===
                'advanced'
                    ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-black/40 border-purple-900/30 hover:border-purple-700'}"
                onclick={() => oracle.setTier("advanced")}
            >
                <span class="text-[10px] font-bold tracking-widest uppercase {oracle.tier === 'advanced' ? 'text-amber-100' : 'text-purple-400'}">Advanced Tier</span>
                <span class="text-[9px] text-purple-300/60 leading-tight">Superior reasoning, complex world-building, and high reliability.</span>
            </button>
        </div>
    </div>

    <!-- Access Management -->
    {#if oracle.apiKey}
        <div
            class="p-4 bg-purple-900/10 border border-purple-900/30 rounded flex items-center justify-between mb-4"
        >
            <div class="flex items-center gap-3">
                <span class="text-purple-400 icon-[heroicons--sparkles] w-5 h-5"
                ></span>
                <div class="flex flex-col">
                    <span class="text-xs text-purple-100 font-bold uppercase tracking-wider"> Personal Key Active </span>
                    <span class="text-[9px] text-purple-500 font-mono">
                        Provides full access to {oracle.tier.toUpperCase()} reasoning.
                    </span>
                </div>
            </div>
            <span class="text-[10px] text-purple-500 font-mono"
                >••••{oracle.apiKey?.slice(-4)}</span
            >
        </div>
    {:else}
        {#if import.meta.env.VITE_SHARED_GEMINI_KEY && oracle.tier === "lite"}
            <div class="p-4 bg-green-900/10 border border-green-900/30 rounded-lg mb-6 flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-green-900/20 flex items-center justify-center text-green-500 shrink-0">
                    <span class="icon-[lucide--check-circle] w-5 h-5"></span>
                </div>
                <div class="flex-1">
                    <h4 class="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Shared Access Active</h4>
                    <p class="text-[11px] text-green-200/60 leading-relaxed">
                        You are using the system-provided shared access for the Lite tier. This allows for basic Oracle consultation without a personal key.
                    </p>
                </div>
            </div>
        {/if}

        <div class="space-y-4 pt-2 border-t border-purple-900/10">
            <div class="flex flex-col gap-1">
                <label
                    for="gemini-api-key"
                    class="text-[10px] text-purple-400 uppercase font-bold flex justify-between"
                >
                    <span>{oracle.tier === "advanced" ? "Required: Advanced Access Key" : "Upgrade to Personal Key"}</span>
                    {#if oracle.tier === "advanced"}
                        <span class="text-amber-500 animate-pulse"
                            >! ADVANCED REQUIRES PERSONAL KEY</span
                        >
                    {/if}
                </label>
                <p class="text-[10px] text-purple-300/40 mb-2">
                    Providing your own key ensures consistent availability and enables higher intelligence tiers.
                </p>
                <div class="relative">
                    <input
                        id="gemini-api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="Paste your Google Gemini API key..."
                        class="w-full bg-black/50 border border-purple-900/50 rounded px-3 py-2 text-sm text-purple-100 focus:border-purple-500 outline-none pr-10 font-mono"
                        bind:value={inputKey}
                    />
                    <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-200 flex items-center justify-center"
                        onclick={() => (showKey = !showKey)}
                        aria-label="{showKey ? 'Hide' : 'Show'} API Key"
                    >
                        <span
                            class={showKey
                                ? "icon-[lucide--eye-off] w-4 h-4"
                                : "icon-[lucide--eye] w-4 h-4"}
                        ></span>
                    </button>
                </div>
            </div>

            <div class="flex items-center justify-between gap-3">
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[10px] text-purple-400 hover:text-purple-300 underline underline-offset-2"
                >
                    Get a free key from Google AI Studio →
                </a>

                <button
                    class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded text-[10px] tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-purple-900/20"
                    onclick={handleSave}
                    disabled={!inputKey.trim()}
                >
                    {oracle.tier === "advanced" ? "ACTIVATE ADVANCED" : "UPGRADE ACCESS"}
                </button>
            </div>
        </div>
    {/if}
</div>
