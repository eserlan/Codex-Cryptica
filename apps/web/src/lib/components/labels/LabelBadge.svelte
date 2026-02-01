<script lang="ts">
  let { 
    label, 
    removable = false, 
    onRemove = () => {} 
  }: { 
    label: string, 
    removable?: boolean, 
    onRemove?: () => void 
  } = $props();
</script>

<div 
  class="inline-flex items-center gap-1 px-2 py-0.5 bg-theme-accent/10 border border-theme-accent/30 rounded text-[10px] font-bold text-theme-accent uppercase tracking-wider whitespace-nowrap group"
>
  <span>{label}</span>
  {#if removable}
    <button 
      onclick={(e) => { e.stopPropagation(); onRemove(); }}
      class="hover:text-theme-primary transition-colors flex items-center justify-center -mr-1 p-0.5"
      aria-label="Remove label {label}"
    >
      <span class="icon-[heroicons--x-mark] w-3 h-3"></span>
    </button>
  {/if}
</div>
