<script lang="ts">
  import type { SilhouetteDefinition } from "schema";
  import { loadSilhouetteSvg } from "schema";

  /**
   * Renders one silhouette's artwork, which lives in R2 rather than in the
   * bundle. Loading is deferred until the glyph is actually near the viewport,
   * because the picker paints a grid of them and there is no reason to pull
   * seventy files for the handful a user scrolls past.
   *
   * The markup is inlined rather than pointed at with an `<img>` so the
   * artwork's `currentColor` still inherits the surrounding theme colour.
   */
  let {
    silhouette,
    class: className = "",
    eager = false,
  }: {
    silhouette: SilhouetteDefinition;
    class?: string;
    eager?: boolean;
  } = $props();

  let host = $state<HTMLDivElement | null>(null);
  let svg = $state<string | null>(null);
  let failed = $state(false);
  let visible = $state(false);

  $effect(() => {
    if (eager || visible || !host) return;
    if (typeof IntersectionObserver === "undefined") {
      visible = true;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible = true;
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!eager && !visible) return;
    const target = silhouette;
    svg = null;
    failed = false;
    void loadSilhouetteSvg(target).then((markup) => {
      // The definition can change while a fetch is in flight (a picker tile
      // being reused, an entity switching type) — only the current one wins.
      if (target !== silhouette) return;
      svg = markup;
      failed = markup === null;
    });
  });
</script>

<div
  bind:this={host}
  class="w-full h-full flex items-center justify-center {className}"
  data-testid="silhouette-glyph"
  data-state={svg ? "loaded" : failed ? "failed" : "loading"}
>
  {#if svg}
    <div
      class="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:block"
    >
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html svg}
    </div>
  {:else if failed}
    <span
      class="icon-[lucide--image-off] h-1/3 w-1/3 opacity-30"
      aria-hidden="true"
      title="Silhouette unavailable offline"
    ></span>
  {:else}
    <div
      class="h-1/2 w-1/2 rounded-full bg-current opacity-10 animate-pulse"
      aria-hidden="true"
    ></div>
  {/if}
</div>
