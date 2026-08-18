<script lang="ts">
  import { tick } from "svelte";
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  let isOpen = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);

  const close = (restoreFocus = false) => {
    isOpen = false;
    if (restoreFocus) triggerEl?.focus();
  };

  const open = async (position?: "first" | "last") => {
    isOpen = true;
    if (!position) return;
    await tick();
    const items =
      menuEl?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    (position === "first" ? items?.[0] : items?.[items.length - 1])?.focus();
  };

  const run = (action: () => void) => {
    close();
    action();
  };

  const handleTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      void open("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      void open("last");
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close(true);
    }
  };

  const handleMenuKeydown = (event: KeyboardEvent) => {
    const items = Array.from(
      menuEl?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(index + direction + items.length) % items.length]?.focus();
    }
  };
</script>

{#if manager.session && !manager.readOnly}
  <div
    class="relative"
    onfocusout={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        close();
    }}
  >
    <button
      bind:this={triggerEl}
      type="button"
      class="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-theme-border text-theme-primary transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      onclick={() => (isOpen ? close() : void open())}
      onkeydown={handleTriggerKeydown}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls="adventure-management-menu"
      aria-label="Adventure management"
      data-testid="adventure-management-menu-button"
    >
      <span class="icon-[lucide--more-vertical] h-4 w-4" aria-hidden="true"
      ></span>
    </button>

    {#if isOpen}
      <div
        bind:this={menuEl}
        id="adventure-management-menu"
        role="menu"
        aria-label="Adventure management"
        tabindex="-1"
        class="absolute right-0 z-[90] mt-2 w-48 rounded-md border border-theme-border bg-theme-surface p-1 shadow-xl"
        onkeydown={handleMenuKeydown}
        data-testid="adventure-management-menu"
      >
        <button
          type="button"
          role="menuitem"
          class="w-full rounded-md px-3 py-2 text-left text-sm text-theme-danger hover:bg-theme-danger/10 focus-visible:outline-2 focus-visible:outline-theme-danger"
          onclick={() => run(() => void manager.end())}
        >
          <span
            class="icon-[lucide--log-out] mr-2 inline-block h-3.5 w-3.5"
            aria-hidden="true"
          ></span>End adventure
        </button>
      </div>
    {/if}
  </div>
{/if}
