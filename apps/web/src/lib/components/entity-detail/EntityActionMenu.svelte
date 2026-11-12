<script lang="ts">
  import { flushSync, tick, onMount } from "svelte";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";
  import type { EntityAction } from "./entity-actions.svelte.js";

  let { items }: { items: EntityAction[] } = $props();

  let isOpen = $state(false);
  let rootEl = $state<HTMLDivElement | null>(null);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);
  let x = $state(0);
  let y = $state(0);

  const menuItems = () =>
    Array.from(
      menuEl?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );

  const updatePosition = async () => {
    if (!triggerEl || !menuEl) return;
    const pos = await computePosition(triggerEl, menuEl, {
      placement: "bottom-end",
      strategy: "fixed",
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    });
    x = pos.x;
    y = pos.y;
  };

  const close = (restoreFocus = false) => {
    isOpen = false;
    if (restoreFocus) triggerEl?.focus();
  };

  const open = async (position?: "first" | "last") => {
    isOpen = true;
    await tick();
    await updatePosition();
    if (!position) return;
    const found = menuItems();
    (position === "first" ? found[0] : found[found.length - 1])?.focus();
  };

  const choose = (item: EntityAction) => {
    close();
    void item.run();
  };

  const focusStep = (direction: 1 | -1) => {
    const found = menuItems();
    const index = found.indexOf(document.activeElement as HTMLButtonElement);
    found[(index + direction + found.length) % found.length]?.focus();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isOpen) {
      // Only the menu closes: the window-level handler would close the panel.
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const down = event.key === "ArrowDown";
    if (event.target === triggerEl) {
      event.preventDefault();
      void open(down ? "first" : "last");
    } else if (isOpen) {
      event.preventDefault();
      focusStep(down ? 1 : -1);
    }
  };

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      if (!triggerEl?.contains(target) && !menuEl?.contains(target)) close();
    };
    // Lets the help highlighter show an item that lives in this closed menu.
    const handleReveal = () => {
      flushSync(() => (isOpen = true));
      void updatePosition();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    rootEl?.addEventListener("codex:help-reveal", handleReveal);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      rootEl?.removeEventListener("codex:help-reveal", handleReveal);
    };
  });
</script>

{#snippet menuItem(item: EntityAction)}
  <button
    type="button"
    role="menuitem"
    disabled={item.disabled}
    aria-label={item.ariaLabel ?? item.label}
    aria-busy={item.state === "busy" ? "true" : "false"}
    title={item.label}
    data-testid={item.testId}
    data-help-target={item.helpTarget}
    class="touch-target flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-50 {item.tone ===
    'danger'
      ? 'text-theme-danger'
      : 'text-theme-text hover:text-theme-primary'}"
    onclick={() => choose(item)}
  >
    <span aria-hidden="true" class="{item.icon} h-4 w-4 shrink-0"></span>
    <span>{item.label}</span>
  </button>
{/snippet}

{#if items.length > 0}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={rootEl}
    class="relative"
    data-help-reveal
    onkeydown={handleKeydown}
  >
    <button
      bind:this={triggerEl}
      type="button"
      class="touch-target flex items-center justify-center gap-1.5 rounded px-2 py-1 text-sm text-theme-text transition hover:bg-theme-primary/10 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-theme-primary"
      onclick={() => (isOpen ? close() : void open())}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label="More"
      title="More"
      data-testid="entity-actions-more-button"
    >
      <span aria-hidden="true" class="icon-[lucide--ellipsis] h-5 w-5"></span>
      <span class="@max-[300px]:hidden">More</span>
    </button>

    <div
      bind:this={menuEl}
      role="menu"
      aria-label="More actions"
      tabindex="-1"
      hidden={!isOpen}
      class="fixed left-0 top-0 z-[90] min-w-52 rounded border border-theme-border bg-theme-surface p-1 shadow-xl"
      style:transform="translate({x}px, {y}px)"
      data-testid="entity-actions-menu"
    >
      {#each items as item, index (item.id)}
        {#if item.tone === "danger" && index > 0}
          <div role="separator" class="my-1 border-t border-theme-border"></div>
        {/if}
        {@render menuItem(item)}
      {/each}
    </div>
  </div>
{/if}
