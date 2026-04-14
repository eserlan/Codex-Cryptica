<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";

  const notification = $derived(uiStore.notification);
</script>

{#if notification}
  <div
    data-testid="toast-{notification.type}"
    class="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 fade-in"
    class:bg-theme-surface={true}
    class:border-theme-primary={notification.type === "success"}
    class:text-theme-primary={notification.type === "success"}
    class:border-blue-500={notification.type === "info"}
    class:text-blue-400={notification.type === "info"}
    class:border-red-500={notification.type === "error"}
    class:text-red-500={notification.type === "error"}
    style:box-shadow="var(--theme-glow)"
    transition:fade
  >
    <span
      class="icon-[lucide--check-circle] w-5 h-5"
      class:hidden={notification.type !== "success"}
    ></span>
    <span
      class="icon-[lucide--info] w-5 h-5"
      class:hidden={notification.type !== "info"}
    ></span>
    <span
      class="icon-[lucide--alert-circle] w-5 h-5"
      class:hidden={notification.type !== "error"}
    ></span>
    <span class="font-header text-xs font-bold tracking-widest uppercase"
      >{notification.message}</span
    >
    {#if notification.persistent}
      <span class="relative flex h-2 w-2 ml-1">
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          class:bg-theme-primary={notification.type === "success"}
          class:bg-blue-400={notification.type === "info"}
          class:bg-red-500={notification.type === "error"}
        ></span>
        <span
          class="relative inline-flex rounded-full h-2 w-2"
          class:bg-theme-primary={notification.type === "success"}
          class:bg-blue-400={notification.type === "info"}
          class:bg-red-500={notification.type === "error"}
        ></span>
      </span>
    {/if}
  </div>
{/if}
