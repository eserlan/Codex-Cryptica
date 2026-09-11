import {
  trackDiscoveryClick as emitDiscoveryClick,
  type DiscoveryClickInput,
} from "$lib/services/analytics/discovery-tracking";

/**
 * Svelte action for discovery-page links/CTAs (#2687):
 * `<a href="..." use:trackDiscoveryClick={{ sourceKind, sourceId, targetKind, targetId, placement }}>`.
 *
 * Fires `discovery_click` on a real `click`, not `mousedown`/`pointerdown`,
 * so a drag-off or a right-click-then-cancel never counts as a click-through.
 * Never calls `preventDefault()`/`stopPropagation()` — this only observes
 * the navigation, it does not gate it (see zaraz-analytics.ts's fail-silent
 * contract: tracking must never be able to block navigation).
 */
export function trackDiscoveryClick(
  node: HTMLElement,
  params: DiscoveryClickInput,
) {
  let current = params;

  function handleClick() {
    emitDiscoveryClick(current);
  }

  node.addEventListener("click", handleClick);

  return {
    update(next: DiscoveryClickInput) {
      current = next;
    },
    destroy() {
      node.removeEventListener("click", handleClick);
    },
  };
}
