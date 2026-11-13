<script lang="ts">
  import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";

  let {
    subjectKey,
    alt,
    credit,
    aiIllustration = true,
    load,
  }: {
    subjectKey: string;
    alt: string;
    credit: string;
    aiIllustration?: boolean;
    load: (signal: AbortSignal) => Promise<ArtworkBlobHandle | null>;
  } = $props();

  let container = $state<HTMLElement>();
  let handle = $state<ArtworkBlobHandle | null>(null);
  let pending = $state(true);

  $effect(() => {
    const _subjectKey = subjectKey;
    const element = container;
    const loader = load;
    if (!element) return;
    const controller = new AbortController();
    let active = true;
    let started = false;
    let owned: ArtworkBlobHandle | null = null;
    handle = null;
    pending = true;
    function start() {
      if (started) return;
      started = true;
      void Promise.resolve()
        .then(() =>
          controller.signal.aborted ? null : loader(controller.signal),
        )
        .then((result) => {
          if (!active || controller.signal.aborted) {
            result?.release();
            return;
          }
          if (result) {
            let released = false;
            owned = {
              url: result.url,
              release: () => {
                if (!released) {
                  released = true;
                  result.release();
                }
              },
            };
          }
          handle = owned;
          pending = false;
        })
        .catch(() => {
          if (active) pending = false;
        });
    }
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                start();
              }
            },
            { rootMargin: "200px" },
          );
    if (observer) observer.observe(element);
    else start();
    return () => {
      active = false;
      controller.abort();
      observer?.disconnect();
      owned?.release();
      owned = null;
    };
  });

  function failed() {
    handle?.release();
    handle = null;
    pending = false;
  }
</script>

<div bind:this={container}>
  {#if pending || handle}
    <figure
      class="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-theme-border bg-theme-surface"
    >
      <div class="aspect-video w-full overflow-hidden">
        {#if handle}
          <img
            src={handle.url}
            {alt}
            width="1280"
            height="720"
            class="h-full w-full object-cover"
            onerror={failed}
          />
        {/if}
      </div>
      {#if handle}<figcaption class="px-3 py-2 text-xs text-theme-text">
          {aiIllustration ? "AI illustration" : "Vault image"}{credit
            ? ` · ${credit}`
            : ""}
        </figcaption>{/if}
    </figure>
  {/if}
</div>
