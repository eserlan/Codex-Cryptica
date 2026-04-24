<script lang="ts">
  let {
    aliases = $bindable([]),
    placeholder = "Add alias...",
  }: {
    aliases: string[];
    placeholder?: string;
  } = $props();

  let inputValue = $state("");

  function addAlias() {
    const trimmed = inputValue.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      aliases = [...aliases, trimmed];
      inputValue = "";
    }
  }

  function removeAlias(index: number) {
    aliases = aliases.filter((_, i) => i !== index);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAlias();
    } else if (e.key === "Backspace" && !inputValue && aliases.length > 0) {
      removeAlias(aliases.length - 1);
    }
  }
</script>

<div
  class="flex flex-wrap items-center gap-1.5 p-1.5 bg-theme-bg/30 border border-theme-border rounded-lg focus-within:border-theme-primary/50 focus-within:ring-1 focus-within:ring-theme-primary/20 transition-all min-h-[36px]"
>
  {#each aliases as alias, i}
    <div
      class="flex items-center gap-1 px-2 py-0.5 rounded bg-theme-primary/10 border border-theme-primary/20 text-[10px] font-bold text-theme-primary uppercase tracking-wider animate-in fade-in zoom-in duration-200"
    >
      <span>{alias}</span>
      <button
        type="button"
        onclick={() => removeAlias(i)}
        class="hover:text-theme-text transition-colors flex items-center justify-center"
        aria-label={`Remove alias ${alias}`}
      >
        <span class="icon-[lucide--x] w-3 h-3"></span>
      </button>
    </div>
  {/each}

  <input
    type="text"
    bind:value={inputValue}
    onkeydown={handleKeydown}
    onblur={addAlias}
    {placeholder}
    class="flex-1 min-w-[80px] bg-transparent border-none text-xs text-theme-text outline-none font-mono placeholder:text-theme-muted/50 py-1"
  />
</div>
