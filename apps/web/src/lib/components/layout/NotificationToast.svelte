<script lang="ts">
  import { fade } from "svelte/transition";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  const notification = $derived(notificationStore.notification);
</script>

{#if notification}
  <div
    data-testid="toast-{notification.type}"
    class="fixed top-20 left-1/2 z-[1001] flex max-w-[min(92vw,44rem)] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 pr-3 shadow-2xl animate-in slide-in-from-top-4 fade-in"
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
    <span class="font-header text-xs font-bold uppercase tracking-widest"
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
    <button
      type="button"
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-current/20 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/40"
      aria-label="Dismiss notification"
      title="Dismiss"
      onclick={() => notificationStore.clearNotification()}
    >
      <span class="icon-[lucide--x] h-4 w-4"></span>
    </button>
  </div>
{/if}
