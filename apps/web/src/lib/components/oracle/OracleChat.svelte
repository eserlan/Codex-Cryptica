<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import { uiStore } from "$stores/ui.svelte";
  import ChatMessage from "./ChatMessage.svelte";
  import CommandMenu from "./CommandMenu.svelte";
  import { chatCommands } from "../../config/chat-commands";
  import { fade } from "svelte/transition";
  import { tick } from "svelte";

  let { onOpenSettings } = $props<{ onOpenSettings?: () => void }>();

  let input = $state("");
  let scrollContainer = $state<HTMLDivElement>();
  let textArea = $state<HTMLTextAreaElement>();
  let commandMenu = $state<ReturnType<typeof CommandMenu>>();
  let showCommandMenu = $state(false);

  const adjustHeight = () => {
    if (!textArea) return;
    textArea.style.height = "auto";
    textArea.style.height = `${Math.min(textArea.scrollHeight, 200)}px`;
  };

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    input; // Reactive dependency
    adjustHeight();

    if (input.startsWith("/")) {
      // Keep menu open if we haven't typed a space yet (command selection)
      // OR if it's the /connect or /merge command (wizard flow)
      if (
        !input.includes(" ") ||
        input.startsWith("/connect") ||
        input.startsWith("/merge")
      ) {
        showCommandMenu = true;
      } else {
        showCommandMenu = false;
      }
    } else {
      showCommandMenu = false;
    }
  });

  const handleSubmit = async () => {
    if (!input || oracle.isLoading) return;
    const query = input.trim();
    input = "";
    if (textArea) textArea.style.height = "";

    // Check if it's a command
    if (query.startsWith("/")) {
      const parts = query.split(" ");
      const cmdName = parts[0];
      const args = parts.slice(1).join(" ");
      const cmd = chatCommands.find((c) => c.name === cmdName);
      if (cmd) {
        await cmd.handler(args);
        return;
      }
    }

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
      class="w-16 h-16 bg-theme-primary/10 rounded-full flex items-center justify-center text-theme-primary mb-2"
    >
      <span class="icon-[heroicons--sparkles] w-8 h-8"></span>
    </div>
    <h3 class="text-theme-text font-bold uppercase tracking-widest text-xs">
      Oracle Offline
    </h3>
    <p class="text-xs text-theme-muted leading-relaxed max-w-[280px]">
      To consult the archives, please provide a <strong
        class="text-theme-primary">Google Gemini API Key</strong
      >
      in the Settings panel.
      {#if !import.meta.env.VITE_SHARED_GEMINI_KEY}
        <br /><span class="text-[10px] opacity-50">
          (Shared key not detected on localhost)</span
        >
      {/if}
    </p>

    <button
      class="px-6 py-2 bg-theme-primary hover:bg-theme-secondary text-theme-bg font-bold rounded-full text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-theme-primary/20"
      onclick={() => {
        if (onOpenSettings) onOpenSettings();
        else uiStore.openSettings();
      }}
    >
      OPEN SETTINGS
    </button>
    <div class="flex flex-col gap-2 w-full pt-4">
      <p class="text-[10px] text-theme-muted font-mono">
        Vault contents never leave this device except for inference via your own
        API key.
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
            class="absolute inset-0 bg-theme-primary/10 blur-xl rounded-full animate-pulse"
          ></div>
          <span
            class="icon-[heroicons--sparkles] w-12 h-12 text-theme-primary relative z-10 opacity-50"
          ></span>
        </div>

        <div class="space-y-2">
          <h4
            class="text-theme-text font-bold uppercase tracking-[0.2em] text-[10px]"
          >
            The Archives are Open
          </h4>
          <p class="text-xs text-theme-muted leading-relaxed font-mono">
            Greetings, Seeker. I am the Oracle, the keeper of your recorded
            lore. Ask of the robber, the mayor, or the shadows beyond the
            village... I shall consult the echoes of your vault.
          </p>
        </div>

        <div class="pt-4 space-y-2">
          <p
            class="text-[9px] text-theme-muted uppercase tracking-widest animate-bounce"
          >
            Awaiting your query...
          </p>
          <div class="flex items-center justify-center gap-3 pt-3">
            <!-- Tier Badge -->
            <div class="flex flex-col items-center gap-1">
              <span
                class="text-[9px] text-theme-muted uppercase tracking-widest font-bold"
                >Current Tier</span
              >
              <span
                class="text-xs px-2 py-0.5 rounded border font-bold uppercase tracking-wider shadow-sm
                                {oracle.tier === 'lite'
                  ? 'border-theme-primary/30 bg-theme-primary/10 text-theme-primary'
                  : 'border-theme-accent/50 bg-theme-accent/10 text-theme-accent shadow-theme-accent/20'}"
              >
                {oracle.tier}
              </span>
            </div>

            {#if !oracle.apiKey}
              <div class="w-px h-6 bg-theme-border mx-1"></div>
              <div class="flex flex-col items-center gap-1">
                <span
                  class="text-[9px] text-theme-muted uppercase tracking-widest font-bold"
                  >Access</span
                >
                <span
                  class="text-xs px-2 py-0.5 rounded border border-theme-primary/30 bg-theme-primary/10 text-theme-primary uppercase tracking-wider font-bold"
                >
                  LITE
                </span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#each oracle.messages as msg}
      <ChatMessage message={msg} />
    {/each}

    {#if oracle.isLoading}
      <div class="flex justify-start" transition:fade>
        <div
          class="bg-theme-surface border border-theme-border px-3 py-2 rounded text-xs text-theme-primary font-mono animate-pulse"
        >
          Consulting archives...
        </div>
      </div>
    {/if}
  </div>

  <!-- Input -->

  <div
    class="p-4 border-t border-theme-border bg-theme-bg/30 shrink-0 relative z-20 overflow-visible"
  >
    {#if showCommandMenu}
      <CommandMenu
        bind:this={commandMenu}
        bind:input
        anchorEl={textArea || null}
        onSelect={(cmd) => {
          input = cmd.name + " ";
          showCommandMenu = false;
          tick().then(() => textArea?.focus());
        }}
        onClose={() => {
          showCommandMenu = false;
        }}
      />
    {/if}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      class="flex gap-2"
    >
      <textarea
        bind:this={textArea}
        bind:value={input}
        data-testid="oracle-input"
        aria-label="Chat Input"
        onkeydown={(e) => {
          if (showCommandMenu && commandMenu?.handleKeyDown(e)) {
            return;
          }
          if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Ask the archives or type &quot;/&quot; for commands..."
        class="flex-1 bg-theme-bg/50 border border-theme-border rounded px-4 py-2.5 text-sm text-theme-text placeholder-theme-text/40 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 transition-all font-mono resize-none overflow-hidden no-scrollbar shadow-inner"
        disabled={oracle.isLoading}
        rows="1"
      ></textarea>
      <button
        type="submit"
        class="w-10 h-10 flex items-center justify-center bg-theme-primary hover:bg-theme-secondary text-theme-bg rounded transition shadow-lg shadow-theme-primary/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shrink-0 self-end"
        disabled={!input.trim() || oracle.isLoading}
        aria-label="Send Message"
      >
        ➤
      </button>
    </form>
  </div>
{/if}

<style>
  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
