<script lang="ts">
  import { tick } from "svelte";
  import { fly } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import type { GuidanceAction } from "help-engine";
  import { KeyboardInset } from "$lib/services/help-assistant/keyboard-inset.svelte";
  import type { HelpAssistantView } from "$lib/services/help-assistant/cif-popout-protocol";
  import HelpActionOffer from "./HelpActionOffer.svelte";
  import HelpAssistantHeader from "./HelpAssistantHeader.svelte";
  import HelpAssistantComposer from "./HelpAssistantComposer.svelte";
  import HelpAssistantMessage from "./HelpAssistantMessage.svelte";
  import HelpQuickPrompts from "./HelpQuickPrompts.svelte";

  let {
    assistant,
    onAccept,
    onOpenArticle,
    onOpenLibrary,
    onClose,
    onPopOut,
    variant = "docked",
  }: {
    assistant: HelpAssistantView;
    onAccept: (action: GuidanceAction) => void;
    onOpenArticle: (helpId: string) => void;
    onOpenLibrary: () => void;
    onClose: () => void;
    /** Shown only where a pop-out window is possible. */
    onPopOut?: () => void;
    /** `window` fills a pop-out window instead of floating beside the sidebar. */
    variant?: "docked" | "window";
  } = $props();

  const docked = $derived(variant === "docked");
  const panelClass = $derived(
    docked
      ? "fixed bottom-[calc(7.25rem_+_env(safe-area-inset-bottom,0px))] left-3 z-[95] flex max-h-[min(36rem,calc(100dvh_-_11rem_-_env(safe-area-inset-bottom,0px)))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-chrome-border bg-chrome-surface shadow-xl md:bottom-16 md:left-[4.5rem] md:max-h-[min(36rem,calc(100dvh-7rem))]"
      : "fixed inset-0 flex flex-col overflow-hidden bg-chrome-surface",
  );

  // The prompt list disappears once a question is asked, so hand focus to the
  // question box rather than leaving it on a removed button.
  async function askQuickPrompt(question: string) {
    void assistant.ask(question);
    await tick();
    document.getElementById("help-assistant-input")?.focus();
  }

  // A small panel is a micro-interaction (150–250ms); none at all when the
  // user asks for reduced motion.
  const reduceMotion = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);

  // On a phone the on-screen keyboard covers the page instead of resizing it,
  // which would leave the question box underneath. While it is up, sit just
  // above it and fit the panel to what is actually visible.
  const keyboard = new KeyboardInset();
  $effect(() => (docked && assistant.isOpen ? keyboard.start() : undefined));
  const transitionMs = $derived(docked && !reduceMotion() ? 250 : 0);
  const keyboardLift = $derived(
    keyboard.keyboardOpen
      ? `bottom: ${keyboard.inset + 8}px; max-height: ${keyboard.visibleHeight - 16}px;`
      : undefined,
  );

  const panelStyle = $derived(docked ? keyboardLift : undefined);

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
    aria-label="Cif, the Codex guide"
    tabindex="-1"
    data-testid="help-assistant-panel"
    class={panelClass}
    transition:fly={{
      x: -24,
      duration: transitionMs,
      easing: quintOut,
    }}
    style={panelStyle}
    onkeydown={onKeydown}
    onoutrostart={(event) =>
      event.currentTarget.setAttribute("aria-hidden", "true")}
  >
    <HelpAssistantHeader
      canStartOver={assistant.messages.length > 0}
      onStartOver={() => assistant.reset()}
      {onPopOut}
      {onClose}
    />

    <div
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 py-3"
      bind:this={conversation}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {#if assistant.messages.length === 0}
        <p class="text-body-ui leading-relaxed text-chrome-muted">
          Ask Cif how to do something in Codex Cryptica. Cif can also show you
          where a button is, but never changes anything in your vault.
        </p>
        <HelpQuickPrompts
          prompts={assistant.quickPrompts}
          onAsk={askQuickPrompt}
        />
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
          <span class="text-body-ui text-chrome-muted">Looking that up…</span>
          <button
            type="button"
            onclick={() => assistant.cancel()}
            class="touch-target ml-auto rounded px-2 py-1 text-meta font-bold uppercase tracking-wider text-chrome-muted hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-chrome-accent"
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
