<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import type { GuidanceAction } from "help-engine";
  import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
  import { helpStore } from "$lib/stores/help.svelte";
  import {
    cifPopout,
    helpActionRunner,
    helpAssistant,
  } from "$lib/stores/help-assistant/help-runtime";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import HelpAssistantPanel from "./HelpAssistantPanel.svelte";
  import HelpHighlightLayer from "./HelpHighlightLayer.svelte";

  const available = $derived(isHelpAssistantAvailable());
  let wasOpen = false;

  // Hand focus back to the button when the panel closes.
  $effect(() => {
    const open = helpAssistant.isOpen;
    if (wasOpen && !open) {
      // The activity bar button is hidden while the map is maximized, so
      // fall back to the map's own button.
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '[data-testid="help-assistant-button"], [data-testid="map-cif-button"]',
      );
      const visible = Array.from(buttons).find(
        (button) => button.offsetParent !== null,
      );
      (visible ?? buttons[0])?.focus();
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

  // Keep an open pop-out window in step with the conversation.
  $effect(() => {
    if (!available) return;
    cifPopout.start();
    return () => cifPopout.stop();
  });
  $effect(() => cifPopout.publish());

  // On a phone there is no second window to move Cif to.
  const canPopOut = $derived(cifPopout.supported && !layoutUIStore.isMobile);

  function popOut() {
    cifPopout.open();
  }

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
    onPopOut={canPopOut ? popOut : undefined}
  />
  <HelpHighlightLayer highlight={helpHighlight} />
{/if}
