<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import { fly } from "svelte/transition";

  let input = $state("");
  let scrollContainer = $state<HTMLDivElement>();
  let newKey = $state("");

  const handleSubmit = async () => {
    if (!input) return;
    const query = input;
    input = "";
    await oracle.ask(query);
  };

  const handleKeySave = async () => {
      if (newKey.trim()) {
          await oracle.setKey(newKey.trim());
          newKey = "";
      }
  };

  $effect(() => {
    // Depend on messages to trigger scroll
    if (oracle.messages.length && scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
</script>

{#if oracle.isOpen}
  <div
    class="fixed bottom-20 right-6 w-96 h-[500px] bg-black/95 border border-purple-900/50 rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
    transition:fly={{ y: 20, duration: 200 }}
  >
    <!-- Header -->
    <div class="px-4 py-3 border-b border-purple-900/30 bg-purple-900/10 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
        <span class="text-xs font-bold text-purple-300 tracking-widest uppercase">Lore Oracle</span>
      </div>
      <button 
        class="text-purple-400 hover:text-purple-200"
        onclick={() => oracle.toggle()}
        aria-label="Close oracle window"
        title="Close"
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    {#if !oracle.apiKey}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <p class="text-sm text-purple-200">
                To consult the Oracle, you must provide a <strong>Google Gemini API Key</strong>.
            </p>
            <p class="text-xs text-purple-400/70">
                Your key is stored locally on this device.
            </p>
            <input 
                type="password" 
                placeholder="Paste API Key here"
                class="w-full bg-black/50 border border-purple-900/50 rounded px-3 py-2 text-sm text-purple-100 focus:border-purple-500 outline-none"
                bind:value={newKey}
            />
            <button 
                class="w-full py-2 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded text-xs tracking-widest"
                onclick={handleKeySave}
                disabled={!newKey.trim()}
            >
                ENABLE ORACLE
            </button>
        </div>
    {:else}
        <!-- Messages -->
        <div 
        class="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-purple-900/50"
        bind:this={scrollContainer}
        >
        {#if oracle.messages.length === 0}
            <div class="h-full flex items-center justify-center text-center p-6 text-purple-900/50">
            <div class="flex flex-col items-center gap-2">
                <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                <p class="text-xs font-mono">AWAITING QUERY...</p>
            </div>
            </div>
        {/if}

        {#each oracle.messages as msg}
            <ChatMessage message={msg} />
        {/each}
        </div>

        <!-- Input -->
        <div class="p-3 border-t border-purple-900/30 bg-black/50">
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex gap-2">
            <input
            bind:value={input}
            placeholder="Ask the archives..."
            class="flex-1 bg-purple-900/10 border border-purple-900/30 rounded px-3 py-2 text-sm text-purple-100 placeholder-purple-900/50 focus:outline-none focus:border-purple-500/50 font-mono"
            disabled={oracle.isLoading} 
            />
            <button
            type="submit"
            class="px-3 bg-purple-900/20 border border-purple-900/50 text-purple-400 hover:text-purple-200 rounded transition disabled:opacity-50"
            disabled={!input.trim() || oracle.isLoading}
            >
            ➤
            </button>
        </form>
        </div>
    {/if}
  </div>
{/if}

<!-- Toggle Button -->
{#if !oracle.isOpen}
  <button
    class="fixed bottom-20 right-6 w-12 h-12 bg-purple-900/20 border border-purple-500/50 rounded-full flex items-center justify-center text-purple-400 hover:bg-purple-900/40 hover:text-purple-200 hover:scale-110 transition shadow-[0_0_15px_rgba(168,85,247,0.3)] z-50 group"
    onclick={() => oracle.toggle()}
    title="Open Lore Oracle"
  >
    <svg class="w-6 h-6 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
  </button>
{/if}