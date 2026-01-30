<script lang="ts">
    let { onJoin }: { onJoin: (username: string) => void } = $props();

    let username = $state("");
    let error = $state<string | null>(null);

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            error = "Username is required";
            return;
        }
        if (username.length < 2) {
            error = "Username too short";
            return;
        }
        onJoin(username.trim());
    };
</script>

<div class="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 font-mono">
    <div class="max-w-md w-full border border-green-900 bg-black p-8 rounded shadow-2xl shadow-green-900/20 text-center">
        <div class="mb-6 flex justify-center">
            <span class="icon-[lucide--globe] w-12 h-12 text-green-500 animate-pulse"></span>
        </div>
        
        <h2 class="text-2xl font-bold text-green-500 mb-2 tracking-[0.2em] uppercase">
            Shared Campaign
        </h2>
        
        <p class="text-gray-500 text-xs mb-8 tracking-widest leading-relaxed">
            YOU ARE ACCESSING A SHARED LORE DEPOSITORY.<br/>
            PLEASE PROVIDE A TEMPORARY IDENTIFIER TO CONTINUE.
        </p>

        <form onsubmit={handleSubmit} class="space-y-6">
            <div class="relative">
                <input
                    bind:value={username}
                    placeholder="Enter Username..."
                    class="w-full bg-black border-b border-green-900 py-3 text-center text-green-400 focus:outline-none focus:border-green-500 transition-colors uppercase tracking-widest placeholder:text-green-900/50"
                />
                {#if error}
                    <p class="absolute -bottom-5 left-0 right-0 text-[10px] text-red-500 uppercase tracking-tighter">
                        {error}
                    </p>
                {/if}
            </div>

            <button
                type="submit"
                class="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-bold tracking-[0.3em] uppercase transition shadow-lg shadow-green-900/10"
            >
                ACCESS ARCHIVE
            </button>
        </form>

        <p class="mt-8 text-[10px] text-gray-700 uppercase tracking-widest">
            Read-only mode enabled. No changes will be persisted.
        </p>
    </div>
</div>
