<script module lang="ts">
  import type { ImageFocus } from "schema";

  /** Shared between the VTT token context menu and the world graph's node
   * context menu — both let you pick which part of a cropped portrait to
   * keep in view. */
  export const IMAGE_FOCUS_OPTIONS: Array<{
    value: ImageFocus;
    label: string;
    icon: string;
  }> = [
    { value: "center", label: "Center", icon: "icon-[lucide--focus]" },
    { value: "top", label: "Top", icon: "icon-[lucide--arrow-up-to-line]" },
    {
      value: "bottom",
      label: "Bottom",
      icon: "icon-[lucide--arrow-down-to-line]",
    },
    {
      value: "left",
      label: "Left",
      icon: "icon-[lucide--arrow-left-to-line]",
    },
    {
      value: "right",
      label: "Right",
      icon: "icon-[lucide--arrow-right-to-line]",
    },
  ];
</script>

<script lang="ts">
  let {
    value,
    onSelect,
  }: {
    value: ImageFocus | undefined;
    onSelect: (focus: ImageFocus) => void;
  } = $props();
</script>

{#each IMAGE_FOCUS_OPTIONS as option (option.value)}
  <button
    type="button"
    class="w-full text-left px-4 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2"
    role="menuitemradio"
    aria-checked={(value ?? "center") === option.value}
    onclick={() => onSelect(option.value)}
  >
    <span class="{option.icon} w-3.5 h-3.5" aria-hidden="true"></span>
    <span class="flex-1">{option.label}</span>
    {#if (value ?? "center") === option.value}
      <span aria-hidden="true">✓</span>
    {/if}
  </button>
{/each}
