<script lang="ts">
  import { tick } from "svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { openImportWindow } from "$lib/stores/ui/navigation";

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
    class="flex items-center gap-1.5 rounded border border-chrome-border px-3 py-1.5 text-xs font-bold tracking-wider text-chrome-muted transition-colors hover:border-chrome-accent hover:text-chrome-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-accent"
    onclick={() => (isOpen ? close() : void open())}
    onkeydown={handleTriggerKeydown}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls="vault-actions-menu"
    title="Vault actions"
    data-testid="vault-actions-menu-button"
  >
    <span class="icon-[lucide--folder-cog] h-3.5 w-3.5" aria-hidden="true"
    ></span>
    Vault
    <span class="icon-[lucide--chevron-down] h-3.5 w-3.5" aria-hidden="true"
    ></span>
  </button>

  {#if isOpen}
    <div
      bind:this={menuEl}
      id="vault-actions-menu"
      role="menu"
      aria-label="Vault actions"
      tabindex="-1"
      class="absolute right-0 z-[90] mt-2 w-56 rounded border border-chrome-border bg-chrome-surface p-1 shadow-xl"
      onkeydown={handleMenuKeydown}
      data-testid="vault-actions-menu"
    >
      <button
        type="button"
        role="menuitem"
        class="w-full rounded px-3 py-2 text-left text-xs text-chrome-text hover:bg-chrome-accent/10 hover:text-chrome-accent focus-visible:outline-2 focus-visible:outline-chrome-accent"
        onclick={() => run(openImportWindow)}
      >
        <span
          class="icon-[lucide--folder-input] mr-2 inline-block h-3.5 w-3.5"
          aria-hidden="true"
        ></span>Import data
      </button>
      <button
        type="button"
        role="menuitem"
        class="w-full rounded px-3 py-2 text-left text-xs text-chrome-text hover:bg-chrome-accent/10 hover:text-chrome-accent focus-visible:outline-2 focus-visible:outline-chrome-accent"
        onclick={() => run(() => modalUIStore.openSettings("vault"))}
      >
        <span
          class="icon-[lucide--download] mr-2 inline-block h-3.5 w-3.5"
          aria-hidden="true"
        ></span>Export backup
      </button>
      <button
        type="button"
        role="menuitem"
        class="w-full rounded px-3 py-2 text-left text-xs text-chrome-text hover:bg-chrome-accent/10 hover:text-chrome-accent focus-visible:outline-2 focus-visible:outline-chrome-accent"
        onclick={() => run(() => modalUIStore.openShare())}
      >
        <span
          class="icon-[lucide--share-2] mr-2 inline-block h-3.5 w-3.5"
          aria-hidden="true"
        ></span>Share campaign
      </button>
    </div>
  {/if}
</div>
