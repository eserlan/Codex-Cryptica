<script lang="ts">
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";

  let {
    input = $bindable(""),
    anchorEl,
    onSelect,
    onClose,
  } = $props<{
    input: string;
    anchorEl: HTMLElement | null;
    onSelect: (value: string) => void;
    onClose: () => void;
  }>();

  let menuEl = $state<HTMLDivElement>();
  let selectedIndex = $state(0);

  const diceSuggestions = [
    { label: "1d20", value: "1d20" },
    { label: "2d20kh1", value: "2d20kh1", desc: "Advantage" },
    { label: "2d20kl1", value: "2d20kl1", desc: "Disadvantage" },
    { label: "1d12", value: "1d12" },
    { label: "1d10", value: "1d10" },
    { label: "1d8", value: "1d8" },
    { label: "1d6", value: "1d6" },
    { label: "1d4", value: "1d4" },
    { label: "1d100", value: "1d100" },
  ];

  let filteredSuggestions = $derived.by(() => {
    if (!input.startsWith("/roll ")) return [];
    const term = input.slice(6).toLowerCase();
    if (!term) return diceSuggestions;
    return diceSuggestions.filter((s) => s.label.toLowerCase().includes(term));
  });

  $effect(() => {
    if (filteredSuggestions.length === 0) {
      onClose();
    }
  });

  // Reset selection when list changes
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    filteredSuggestions;
    selectedIndex = 0;
  });

  // Position the menu
  $effect(() => {
    if (anchorEl && menuEl && filteredSuggestions.length > 0) {
      computePosition(anchorEl, menuEl, {
        strategy: "absolute",
        placement: "top-start",
        middleware: [offset(8), flip(), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        if (menuEl) {
          menuEl.style.left = `${x}px`;
          menuEl.style.top = `${y}px`;
          menuEl.style.opacity = "1";
        }
      });
    }
  });

  export const handleKeyDown = (e: KeyboardEvent) => {
    if (filteredSuggestions.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredSuggestions.length;
      return true;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + filteredSuggestions.length) %
        filteredSuggestions.length;
      return true;
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const selected = filteredSuggestions[selectedIndex];
      onSelect(selected.value);
      return true;
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return true;
    }
    return false;
  };
</script>

{#if filteredSuggestions.length > 0}
  <div
    bind:this={menuEl}
    class="absolute z-[100] w-48 bg-theme-surface border border-theme-border rounded shadow-2xl overflow-hidden flex flex-col opacity-0 transition-opacity duration-150"
  >
    <div
      class="px-3 py-1.5 bg-theme-bg/50 border-b border-theme-border text-[9px] uppercase tracking-widest font-bold font-header text-theme-muted"
    >
      Dice Roll Formulas
    </div>
    <div class="max-h-60 overflow-y-auto p-1">
      {#each filteredSuggestions as item, i}
        <button
          class="w-full text-left px-3 py-2 rounded flex flex-col gap-0.5 transition-colors
            {i === selectedIndex
            ? 'bg-theme-primary/20 text-theme-primary'
            : 'hover:bg-theme-bg/30 text-theme-text'}"
          onclick={() => onSelect(item.value)}
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-sm font-bold">{item.label}</span>
            {#if item.desc}
              <span
                class="text-[9px] opacity-50 uppercase tracking-tighter font-header font-bold"
                >{item.desc}</span
              >
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}
