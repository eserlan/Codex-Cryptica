<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { labelHref } from "#lib/content/labels.js";

  let { label, size = "md" }: { label: string; size?: "sm" | "md" | "lg" } =
    $props();
  const cleanBase = basePath();
  const sizeClasses = $derived(
    size === "sm"
      ? "px-1.5 py-0.5 text-nano"
      : size === "lg"
        ? "px-2.5 py-1 text-sm"
        : "px-2 py-1 text-micro",
  );
</script>

<!--
  A real link, not a filter button: clicking a public label routes to the
  cross-family `/explore?label=X` discovery view (#2762) rather than acting
  on the page it's shown on.
-->
<a
  href="{cleanBase}{labelHref(label)}"
  class="{sizeClasses} rounded border border-theme-primary/30 bg-theme-primary/10 font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary hover:bg-theme-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
  data-testid="public-label-chip"
>
  #{label}
</a>
