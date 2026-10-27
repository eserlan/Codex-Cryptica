<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { TOPIC_LAYOUT } from "./topic-layout.js";

  let { children }: { children: import("svelte").Snippet } = $props();

  // A bare "/" base would make every link protocol-relative ("//explore").
  const cleanBase = basePath();
</script>

<!-- Page chrome shared by the topic hubs: background, wide canvas, breadcrumb. -->
<div
  class="bg-theme-bg font-body text-theme-text selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <article
    class="{TOPIC_LAYOUT.canvas} break-words py-12 text-lg leading-relaxed sm:py-20"
  >
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/explore"
        class="inline-flex min-h-[24px] items-center gap-2 py-1 font-mono text-xs text-theme-text transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Explore all topics
      </a>
    </nav>

    {@render children()}
  </article>
</div>
