<script lang="ts">
  import type { ImageRef } from "biome-engine";

  let { image, compact = false }: { image: ImageRef; compact?: boolean } =
    $props();

  // Provenance fields that are still being filled in are not shown.
  const known = (value: string) => value && value !== "pending";
</script>

<span class="mt-1 block text-xs text-theme-muted">
  {#if image.origin === "generated"}
    <span class="font-medium text-theme-text">AI illustration</span>
    {#if !compact}
      {#if known(image.tool)}<span> · {image.tool}</span>{/if}
      {#if known(image.generatedAt)}<span> · {image.generatedAt}</span>{/if}
    {/if}
  {:else}
    <span class="font-medium text-theme-text"
      >{image.kind === "photograph" ? "Photo" : "Illustration"}</span
    >
    <span> · {image.creator}</span>
    {#if !compact}
      <span> · </span>
      <a
        href={image.licenceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-theme-primary hover:underline">{image.licence}</a
      >
      <span> · </span>
      <a
        href={image.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-theme-primary hover:underline">Original source</a
      >
    {/if}
  {/if}
</span>
