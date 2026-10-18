<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import type { GuidanceAction } from "help-engine";
  import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
  import { shouldStepAside } from "$lib/services/help-assistant/cif-step-aside";
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
  import { helpStore } from "$lib/stores/help.svelte";
  import {
    cifFlight,
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

  // Closing the chat mid-flight sends a homeward Cif to the Cif button instead,
  // or ends the flight when there is none.
  $effect(() => {
    if (!helpAssistant.isOpen) cifFlight.homeLost();
  });

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
    if (!ran) return;
    // Stay open so the user can keep asking while Cif points, unless the
    // panel would be in the way of what the guide just showed.
    const panel = document
      .querySelector('[data-testid="help-assistant-panel"]')
      ?.getBoundingClientRect();
    const stepAside = shouldStepAside({
      isMobile: layoutUIStore.isMobile,
      action,
      highlight: helpHighlight.current?.rect ?? null,
      panel: panel ?? null,
    });
    if (stepAside) {
      helpAssistant.close();
      return;
    }
    // The "Show me" button is gone with the offer. Leave focus in the chat,
    // on the question box, unless something else already holds it.
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) {
      document.getElementById("help-assistant-input")?.focus();
    }
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
    avatarAway={cifFlight.away}
  />
  <HelpHighlightLayer highlight={helpHighlight} flight={cifFlight} />
{/if}
