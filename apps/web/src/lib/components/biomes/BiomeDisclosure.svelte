<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    title,
    open,
    onToggle,
    children,
  }: {
    id: string;
    title: string;
    open: boolean;
    onToggle: () => void;
    children: Snippet;
  } = $props();
</script>

<section class="rounded-lg border border-theme-border bg-theme-surface">
  <h3 class="m-0">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-theme-text"
      aria-expanded={open}
      aria-controls={id}
      onclick={onToggle}
    >
      <span>{title}</span>
      <span
        class={open
          ? "icon-[lucide--chevron-up] h-4 w-4"
          : "icon-[lucide--chevron-down] h-4 w-4"}
        aria-hidden="true"
      ></span>
    </button>
  </h3>
  {#if open}
    <div {id} class="flex flex-col gap-3 px-4 pb-4 text-sm text-theme-text">
      {@render children()}
    </div>
  {/if}
</section>
