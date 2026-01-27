<script lang="ts">
    import OracleChat from "$lib/components/oracle/OracleChat.svelte";
    import { oracle } from "$lib/stores/oracle.svelte";
    import { onMount } from "svelte";

    onMount(() => {
        oracle.init();
        document.title = "Lore Oracle | Codex Arcana";
    });
</script>

<div class="fixed inset-0 bg-[#050505] flex flex-col overflow-hidden">
    <!-- Standalone Header -->
    <div
        class="px-4 py-3 border-b border-purple-900/30 bg-purple-900/20 flex justify-between items-center shrink-0"
    >
        <div class="flex items-center gap-2">
            <div
                class="w-2 h-2 bg-purple-500 rounded-full {oracle.isLoading
                    ? 'animate-pulse'
                    : ''}"
            ></div>
            <span
                class="text-[10px] font-bold text-purple-300 tracking-[0.2em] uppercase"
                >Lore Oracle Standalone</span
            >
        </div>
        <div
            class="text-[9px] font-mono text-purple-700 uppercase tracking-widest hidden sm:block"
        >
            Multi-Window Sync Active
        </div>
    </div>

    <OracleChat
        onOpenSettings={() => {
            alert("Please update settings in the main Codex Arcana window.");
        }}
    />
</div>

<style>
    :global(body) {
        background: #050505;
        margin: 0;
        padding: 0;
    }
</style>
