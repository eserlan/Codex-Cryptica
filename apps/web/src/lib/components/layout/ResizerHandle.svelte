<script lang="ts">
  import { onDestroy } from "svelte";

  interface Props {
    side: "left" | "right";
    minWidth: number;
    maxWidthVW: number;
    currentWidth: number;
    onResize: (newWidth: number) => void;
  }

  let { side, minWidth, maxWidthVW, currentWidth, onResize }: Props = $props();

  let handleRef: HTMLDivElement;
  let isDragging = $state(false);
  let startX = $state(0);
  let startWidth = $state(0);

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // Only left click
    isDragging = true;
    startX = e.clientX;
    startWidth = currentWidth;
    handleRef.setPointerCapture(e.pointerId);

    // Add global dragging class for cursor and iframe prevention
    document.body.classList.add("is-resizing-sidebar");
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;

    let delta = e.clientX - startX;

    // For the right sidebar, moving left (negative delta) increases width
    if (side === "right") {
      delta = -delta;
    }

    let newWidth = startWidth + delta;

    // Calculate boundaries
    const maxWidthPx = (window.innerWidth * maxWidthVW) / 100;

    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidthPx));

    onResize(newWidth);
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    handleRef.releasePointerCapture(e.pointerId);
    document.body.classList.remove("is-resizing-sidebar");
  }

  // Cleanup in case component unmounts while dragging
  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("is-resizing-sidebar");
    }
  });
</script>

<div
  bind:this={handleRef}
  class="resizer-handle group absolute top-0 bottom-0 z-[100] w-6 cursor-col-resize transition-all"
  class:right-0={side === "left"}
  class:-mr-3={side === "left"}
  class:left-0={side === "right"}
  class:-ml-3={side === "right"}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
  role="separator"
  aria-orientation="vertical"
  aria-valuenow={currentWidth}
  aria-valuemin={minWidth}
  tabindex="-1"
>
  <!-- Vertical line centered in the hit area -->
  <div
    class="absolute inset-y-0 left-1/2 w-[2px] transition-colors -translate-x-1/2"
    class:bg-theme-accent={isDragging}
    class:bg-theme-border={!isDragging}
    class:group-hover:bg-theme-accent={true}
    class:opacity-0={!isDragging}
    class:group-hover:opacity-100={true}
  ></div>

  <!-- Visual grip indicator centered on the line -->
  <div
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-[8px] rounded-full transition-all flex flex-col items-center justify-center gap-[3px] border border-theme-surface shadow-md z-10"
    class:bg-theme-accent={isDragging}
    class:bg-theme-border={!isDragging}
    class:group-hover:bg-theme-accent={true}
    class:opacity-60={!isDragging}
    class:group-hover:opacity-100={true}
    class:scale-110={isDragging}
  >
    <div class="w-[2px] h-[2px] rounded-full bg-theme-surface opacity-90"></div>
    <div class="w-[2px] h-[2px] rounded-full bg-theme-surface opacity-90"></div>
    <div class="w-[2px] h-[2px] rounded-full bg-theme-surface opacity-90"></div>
  </div>
</div>

<style>
  /* Ensure this global class is available in app.css or layout for body */
  :global(.is-resizing-sidebar) {
    cursor: col-resize !important;
    user-select: none !important;
  }

  :global(.is-resizing-sidebar iframe) {
    pointer-events: none !important;
  }
</style>
