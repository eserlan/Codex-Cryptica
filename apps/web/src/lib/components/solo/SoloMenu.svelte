<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    testId,
    disabled = false,
    reason = null,
    helpTarget = undefined,
    children,
  }: {
    label: string;
    testId: string;
    /** The Cif control id this trigger answers to (data-help-target). */
    helpTarget?: string;
    disabled?: boolean;
    reason?: string | null;
    children: Snippet;
  } = $props();

  let open = $state(false);
  // The panel is position:fixed so the bar's overflow-x scroller cannot clip it
  // (overflow-x: auto also clips vertically, which hid the menus entirely).
  let panelStyle = $state("");
  let trigger: HTMLButtonElement | undefined = $state();
  let panel: HTMLDivElement | undefined = $state();

  const PANEL_GAP = 8;
  const PANEL_MAX_WIDTH = 320;

  /** Opens toward the roomier side and keeps the panel inside the viewport. */
  function placePanel(rect: DOMRect) {
    const left = Math.max(
      PANEL_GAP,
      Math.min(rect.left, window.innerWidth - PANEL_MAX_WIDTH),
    );
    const spaceAbove = Math.max(0, rect.top - PANEL_GAP);
    const spaceBelow = Math.max(
      0,
      window.innerHeight - rect.bottom - PANEL_GAP,
    );
    const opensBelow = spaceBelow >= spaceAbove;
    const vertical = opensBelow
      ? `top: ${rect.bottom + PANEL_GAP}px`
      : `bottom: ${window.innerHeight - rect.top + PANEL_GAP}px`;
    const maxHeight = opensBelow ? spaceBelow : spaceAbove;
    return `left: ${left}px; ${vertical}; max-height: ${maxHeight}px`;
  }

  function toggle() {
    if (disabled) return;
    if (!open && trigger) {
      panelStyle = placePanel(trigger.getBoundingClientRect());
    }
    open = !open;
  }

  function close(returnFocus: boolean) {
    open = false;
    if (returnFocus) trigger?.focus();
  }

  /** Choosing an item closes the menu; the item itself does the work. */
  function onPanelClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[role="menuitem"]')) close(false);
  }

  function onPanelKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    }
  }

  function onWindowPointerDown(event: PointerEvent) {
    if (!open) return;
    const target = event.target as Node | null;
    if (target && (panel?.contains(target) || trigger?.contains(target)))
      return;
    close(false);
  }

  // A fixed panel would drift away from its trigger when the bar scrolls.
  $effect(() => {
    if (!open) return;
    const closeOnScroll = (event: Event) => {
      if (event.target instanceof Node && panel?.contains(event.target)) return;
      close(false);
    };
    window.addEventListener("scroll", closeOnScroll, true);
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  });
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onresize={() => close(false)}
/>

<div class="relative inline-block">
  <button
    bind:this={trigger}
    type="button"
    class="rounded-md px-2 py-1 text-sm text-theme-text hover:text-theme-primary disabled:opacity-50"
    data-testid={testId}
    data-help-target={helpTarget}
    aria-label={label}
    aria-expanded={open}
    aria-haspopup="true"
    {disabled}
    title={disabled && reason ? reason : label}
    onclick={toggle}
  >
    {label}
  </button>

  {#if open}
    <div
      bind:this={panel}
      class="fixed z-[85] min-w-48 overflow-y-auto rounded-lg border border-theme-border bg-theme-surface p-2 shadow-xl"
      style={panelStyle}
      data-testid="solo-menu-panel"
      role="menu"
      tabindex="-1"
      onkeydown={onPanelKeydown}
      onclick={onPanelClick}
    >
      {@render children()}
    </div>
  {/if}
</div>
