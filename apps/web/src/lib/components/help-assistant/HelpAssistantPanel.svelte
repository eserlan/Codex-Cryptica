<script lang="ts">
  import { tick } from "svelte";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import type { GuidanceAction } from "help-engine";
  import { KeyboardInset } from "$lib/services/help-assistant/keyboard-inset.svelte";
  import type { HelpAssistantStore } from "$lib/stores/help-assistant/help-assistant.svelte";
  import HelpActionOffer from "./HelpActionOffer.svelte";
  import HelpAssistantComposer from "./HelpAssistantComposer.svelte";
  import HelpAssistantMessage from "./HelpAssistantMessage.svelte";

  let {
    assistant,
    onAccept,
    onOpenArticle,
    onOpenLibrary,
    onClose,
  }: {
    assistant: HelpAssistantStore;
    onAccept: (action: GuidanceAction) => void;
    onOpenArticle: (helpId: string) => void;
    onOpenLibrary: () => void;
    onClose: () => void;
  } = $props();

  // A small panel is a micro-interaction (150–250ms); none at all when the
  // user asks for reduced motion.
  const reduceMotion = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);

  // On a phone the on-screen keyboard covers the page instead of resizing it,
  // which would leave the question box underneath. While it is up, sit just
  // above it and fit the panel to what is actually visible.
  const keyboard = new KeyboardInset();
  $effect(() => (assistant.isOpen ? keyboard.start() : undefined));
  const keyboardLift = $derived(
    keyboard.keyboardOpen
      ? `bottom: ${keyboard.inset + 8}px; max-height: ${keyboard.visibleHeight - 16}px;`
      : undefined,
  );

  let conversation: HTMLDivElement | undefined = $state();

  $effect(() => {
    const container = conversation;
    // Follow new messages and the pending/action rows after their DOM updates.
    const state = {
      open: assistant.isOpen,
      messages: assistant.messages.length,
      pending: assistant.isPending,
      offer: assistant.offer,
    };
    if (!state.open || !container) return;
    let active = true;
    void tick().then(() => {
      if (active) container.scrollTop = container.scrollHeight;
    });
    return () => {
      active = false;
    };
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }
</script>

{#if assistant.isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="dialog"
    aria-modal="false"
    aria-label="Help assistant"
    tabindex="-1"
    data-testid="help-assistant-panel"
    class="fixed bottom-[calc(7.25rem_+_env(safe-area-inset-bottom,0px))] left-3 z-[95] flex max-h-[min(36rem,calc(100dvh_-_11rem_-_env(safe-area-inset-bottom,0px)))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-chrome-border bg-chrome-surface shadow-xl md:bottom-16 md:left-[4.5rem] md:max-h-[min(36rem,calc(100dvh-7rem))]"
    transition:fly={{
      x: -24,
      duration: reduceMotion() ? 0 : 250,
      easing: quintOut,
    }}
    style={keyboardLift}
    onkeydown={onKeydown}
    onoutrostart={(event) =>
      event.currentTarget.setAttribute("aria-hidden", "true")}
  >
    <header
      class="flex items-center justify-between gap-2 border-b border-chrome-border px-3 py-2"
    >
      <h2 class="text-sm font-bold text-chrome-text">Help assistant</h2>
      <div class="flex items-center gap-1">
        {#if assistant.messages.length > 0}
          <button
            type="button"
            onclick={() => assistant.reset()}
            class="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
          >
            Start over
          </button>
        {/if}
        <button
          type="button"
          onclick={onClose}
          aria-label="Close"
          class="rounded p-1 text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>
    </header>

    <div
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 py-3"
      bind:this={conversation}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {#if assistant.messages.length === 0}
        <p class="text-xs leading-relaxed text-chrome-muted">
          Ask how to do something in Codex Cryptica. I can also show you where a
          button is. I can't change anything in your vault.
        </p>
      {/if}

      {#each assistant.messages as message (message.id)}
        <HelpAssistantMessage {message} {onOpenArticle} {onOpenLibrary} />
      {/each}

      {#if assistant.isPending}
        <div class="flex items-center gap-2" role="status">
          <span
            aria-hidden="true"
            class="icon-[lucide--loader-circle] h-4 w-4 animate-spin text-chrome-accent motion-reduce:animate-none"
          ></span>
          <span class="text-xs text-chrome-muted">Looking that up…</span>
          <button
            type="button"
            onclick={() => assistant.cancel()}
            class="ml-auto rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
          >
            Cancel
          </button>
        </div>
      {/if}

      {#if assistant.offer}
        <HelpActionOffer
          action={assistant.offer}
          onAccept={() => assistant.offer && onAccept(assistant.offer)}
          onDismiss={() => assistant.dismissOffer()}
        />
      {/if}
    </div>

    <HelpAssistantComposer
      pending={assistant.isPending}
      notice={assistant.notice}
      focusWhen={assistant.isOpen}
      onAsk={async (text) => {
        const started = await assistant.ask(text);
        return started && assistant.status !== "idle";
      }}
    />
  </div>
{/if}
