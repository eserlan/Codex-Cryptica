<script lang="ts">
  import type { Snippet } from "svelte";
  import { PanZoomState } from "./pan-zoom.svelte";

  let { panZoom, onElement, children } = $props<{
    panZoom: PanZoomState;
    onElement: (element: HTMLDivElement | undefined) => void;
    children: Snippet;
  }>();

  let element = $state<HTMLDivElement>();

  $effect(() => {
    onElement(element);
    return () => onElement(undefined);
  });

  function pointerDown(event: PointerEvent) {
    element?.setPointerCapture(event.pointerId);
    panZoom.onPointerDown(event);
  }

  function pointerEnd(event: PointerEvent) {
    panZoom.onPointerUp(event);
    if (element?.hasPointerCapture(event.pointerId))
      element.releasePointerCapture(event.pointerId);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={element}
  data-testid="lineage-pan-zoom"
  class="relative h-full w-full touch-none overflow-hidden"
  style="touch-action: none;"
  tabindex="0"
  role="application"
  aria-label="Lineage canvas — drag to pan, scroll or pinch to zoom, arrow keys to pan, plus/minus to zoom"
  onpointerdown={pointerDown}
  onpointermove={(event) => panZoom.onPointerMove(event)}
  onpointerup={pointerEnd}
  onpointercancel={pointerEnd}
  onwheel={(event) => panZoom.onWheel(event, element!)}
  onkeydown={(event) => panZoom.onKeyDown(event)}
>
  {@render children()}
</div>
