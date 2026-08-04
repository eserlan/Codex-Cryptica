<script lang="ts">
  let {
    locked = false,
    onToggleLock,
    onBringToFront,
    onSendToBack,
    onDuplicate,
    onDelete,
  }: {
    locked?: boolean;
    onToggleLock?: () => void;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
  } = $props();
</script>

{#if onToggleLock}
  <button
    type="button"
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
    onclick={onToggleLock}
  >
    <span
      class={locked
        ? "icon-[lucide--lock-open] w-3.5 h-3.5"
        : "icon-[lucide--lock] w-3.5 h-3.5"}
      aria-hidden="true"
    ></span>{locked ? "Unlock" : "Lock in Place"}
  </button>
{/if}
{#if onBringToFront}
  <button
    type="button"
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
    onclick={onBringToFront}
    ><span class="icon-[lucide--bring-to-front] w-3.5 h-3.5" aria-hidden="true"
    ></span>Bring to Front</button
  >
{/if}
{#if onSendToBack}
  <button
    type="button"
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
    onclick={onSendToBack}
    ><span class="icon-[lucide--send-to-back] w-3.5 h-3.5" aria-hidden="true"
    ></span>Send to Back</button
  >
{/if}
{#if onDuplicate}
  <button
    type="button"
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
    onclick={onDuplicate}
    ><span class="icon-[lucide--copy-plus] w-3.5 h-3.5" aria-hidden="true"
    ></span>Duplicate</button
  >
{/if}
{#if onDelete}
  <button
    type="button"
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
    onclick={onDelete}
    ><span class="icon-[lucide--trash-2] w-3.5 h-3.5" aria-hidden="true"
    ></span>Delete</button
  >
{/if}
