<script lang="ts">
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
  import { helpAssistant } from "$lib/stores/help-assistant/help-runtime";
  import { getPrimaryButtonStateClass } from "$lib/components/map/vtt-ui";

  const available = $derived(isHelpAssistantAvailable());
</script>

<!--
  The activity bar's Cif button is hidden while the map is maximized, so the
  map controls carry their own way in.
-->
{#if available}
  <button
    type="button"
    class={`touch-target flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-micro font-bold uppercase tracking-wider transition-all ${getPrimaryButtonStateClass(helpAssistant.isOpen)}`}
    onclick={() =>
      helpAssistant.isOpen ? helpAssistant.close() : helpAssistant.open()}
    aria-pressed={helpAssistant.isOpen}
    aria-label={helpAssistant.isOpen ? "Close Cif" : "Ask Cif"}
    title={helpAssistant.isOpen
      ? "Close Cif"
      : "Ask Cif how to use the map and play tools"}
    data-testid="map-cif-button"
  >
    <span
      aria-hidden="true"
      class="icon-[lucide--message-circle-question] h-4 w-4"
    ></span>
    <span>Cif</span>
  </button>
{/if}
