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
    <div class="mb-4 space-y-2">
        <span class="text-[10px] text-purple-400 uppercase font-bold block"
            >Oracle Tier</span
        >
        <div class="grid grid-cols-2 gap-2">
            <button
                class="px-3 py-2 rounded text-[10px] font-bold tracking-widest transition-all border {oracle.tier ===
                'lite'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-100'
                    : 'bg-black/40 border-purple-900/30 text-purple-400 hover:border-purple-700'}"
                onclick={() => oracle.setTier("lite")}
            >
                LITE (2.5 FLASH)
            </button>
            <button
                class="px-3 py-2 rounded text-[10px] font-bold tracking-widest transition-all border {oracle.tier ===
                'advanced'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-100'
                    : 'bg-black/40 border-purple-900/30 text-purple-400 hover:border-purple-700'}"
                onclick={() => oracle.setTier("advanced")}
            >
                ADVANCED (3 FLASH)
            </button>
        </div>
    </div>

    <!-- Personal Key Status/Management -->
    {#if oracle.apiKey}
        <div
            class="p-3 bg-purple-900/10 border border-purple-900/30 rounded flex items-center justify-between mb-4"
        >
            <div class="flex items-center gap-2">
                <span class="text-purple-400 icon-[heroicons--sparkles] w-4 h-4"
                ></span>
                <span class="text-xs text-purple-100"> Oracle is Active </span>
            </div>
            <span class="text-[10px] text-purple-500 font-mono"
                >KEY: ••••••••••••{oracle.apiKey?.slice(-4)}</span
            >
        </div>
    {:else}
        <div class="space-y-3 mt-4">
            <div class="flex flex-col gap-1">
                <label
                    for="gemini-api-key"
                    class="text-[10px] text-purple-400 uppercase font-bold flex justify-between"
                >
                    <span>Gemini API Key</span>
                    {#if oracle.tier === "advanced"}
                        <span class="text-amber-500 animate-pulse"
                            >! REQUIRED FOR ADVANCED</span
                        >
                    {/if}
                </label>
                <div class="relative">
                    <input
                        id="gemini-api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="Paste your API key here..."
                        class="w-full bg-black/50 border border-purple-900/50 rounded px-3 py-2 text-sm text-purple-100 focus:border-purple-500 outline-none pr-10"
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
                    class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded text-[10px] tracking-widest transition-all disabled:opacity-50"
                    onclick={handleSave}
                    disabled={!inputKey.trim()}
                >
                    ENABLE
                </button>
            </div>
        </div>

        {#if import.meta.env.VITE_SHARED_GEMINI_KEY && oracle.tier === "lite"}
            <div class="mt-4 p-2 bg-green-900/10 border border-green-900/20 rounded text-[10px] text-green-400 font-mono uppercase text-center">
                Shared Lite Access Available
            </div>
        {/if}
    {/if}
</div>
