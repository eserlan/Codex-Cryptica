<script lang="ts">
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
    class="fixed bottom-[calc(7.25rem_+_env(safe-area-inset-bottom,0px))] left-3 z-[95] flex max-h-[min(36rem,calc(100dvh_-_11rem_-_env(safe-area-inset-bottom,0px)))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-theme-border bg-theme-surface shadow-xl md:bottom-16 md:left-[4.5rem] md:max-h-[min(36rem,calc(100dvh-7rem))]"
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
      class="flex items-center justify-between gap-2 border-b border-theme-border px-3 py-2"
    >
      <h2 class="font-header text-sm font-bold text-theme-text">
        Help assistant
      </h2>
      <div class="flex items-center gap-1">
        {#if assistant.messages.length > 0}
          <button
            type="button"
            onclick={() => assistant.reset()}
            class="touch-target rounded px-2 py-1 text-meta font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text focus-visible:outline-2 focus-visible:outline-theme-primary"
          >
            Start over
          </button>
        {/if}
        <button
          type="button"
          onclick={onClose}
          aria-label="Close"
          class="rounded p-1 text-theme-muted hover:text-theme-text focus-visible:outline-2 focus-visible:outline-theme-primary"
        >
          <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      </div>
    </header>

    <div
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3 py-3"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {#if assistant.messages.length === 0}
        <p class="text-body-ui leading-relaxed text-theme-muted">
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
            class="icon-[lucide--loader-circle] h-4 w-4 animate-spin text-theme-primary motion-reduce:animate-none"
          ></span>
          <span class="text-body-ui text-theme-muted">Looking that up…</span>
          <button
            type="button"
            onclick={() => assistant.cancel()}
            class="ml-auto rounded px-2 py-1 text-meta font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text focus-visible:outline-2 focus-visible:outline-theme-primary"
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
