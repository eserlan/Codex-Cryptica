<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import type { GuidanceAction } from "help-engine";
  import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
  import { helpStore } from "$lib/stores/help.svelte";
  import {
    helpActionRunner,
    helpAssistant,
  } from "$lib/stores/help-assistant/help-runtime";
  import HelpAssistantPanel from "./HelpAssistantPanel.svelte";
  import HelpHighlightLayer from "./HelpHighlightLayer.svelte";

  const available = $derived(isHelpAssistantAvailable());
  let wasOpen = false;

  // Hand focus back to the button when the panel closes.
  $effect(() => {
    const open = helpAssistant.isOpen;
    if (wasOpen && !open) {
      document
        .querySelector<HTMLButtonElement>(
          '[data-testid="help-assistant-button"]',
        )
        ?.focus();
    }
    wasOpen = open;
  });

  // Turning AI off (or the flag) while help is open closes it and clears it.
  $effect(() => {
    if (!available) {
      helpAssistant.reset();
      helpAssistant.close();
      helpHighlight.clear();
    }
  });

  afterNavigate(() => helpHighlight.clear());

  function close() {
    helpHighlight.clear();
    helpAssistant.close();
  }

  async function accept(action: GuidanceAction) {
    helpAssistant.dismissOffer();
    const ran = await helpActionRunner.run(action);
    // Step out of the way so the control being pointed at is visible.
    if (ran) helpAssistant.close();
  }
</script>

{#if available}
  <HelpAssistantPanel
    assistant={helpAssistant}
    onAccept={accept}
    onOpenArticle={(id) => helpStore.openHelpToArticle(id)}
    onOpenLibrary={() => helpStore.openHelpWindow()}
    onClose={close}
  />
  <HelpHighlightLayer highlight={helpHighlight} />
{/if}
