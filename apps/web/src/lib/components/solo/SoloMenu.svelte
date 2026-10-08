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
  let openBelow = $state(false);
  let trigger: HTMLButtonElement | undefined = $state();
  let panel: HTMLDivElement | undefined = $state();

  function toggle() {
    if (disabled) return;
    if (!open && trigger) {
      // Open toward the roomier side: the bar sits under the header, so a
      // menu opening upward would be clipped off the top of the screen.
      openBelow = trigger.getBoundingClientRect().top < window.innerHeight / 2;
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
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

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
      class="absolute left-0 z-[85] min-w-48 rounded-lg border border-theme-border bg-theme-surface p-2 shadow-xl {openBelow
        ? 'top-full mt-2'
        : 'bottom-full mb-2'}"
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
