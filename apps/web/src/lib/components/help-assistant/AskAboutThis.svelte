<script lang="ts">
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";

  const available = $derived(isHelpAssistantAvailable());

  // The help runtime is loaded on click, so this small shortcut (which ships
  // in the main bundle with the Connections tab) does not drag the help code
  // in with it when the assistant is off.
  async function open() {
    const { helpAssistant } =
      await import("$lib/stores/help-assistant/help-runtime");
    helpAssistant.open();
  }
</script>

{#if available}
  <button
    type="button"
    onclick={open}
    data-testid="ask-about-this"
    class="touch-target flex items-center gap-1 self-start rounded px-2 py-1 text-meta font-bold uppercase tracking-wider text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary"
  >
    <span
      aria-hidden="true"
      class="icon-[lucide--message-circle-question] h-3.5 w-3.5"
    ></span>
    Ask about this
  </button>
{/if}
