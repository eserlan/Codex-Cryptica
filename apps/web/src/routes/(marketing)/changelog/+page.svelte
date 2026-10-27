<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { fly } from "svelte/transition";

  let { data } = $props();
</script>

<svelte:head>
  <title>The Chronology | Codex Cryptica Changelog</title>
  <meta
    name="description"
    content="Follow the evolution of Codex Cryptica. Detailed release notes on new features, security updates, and architectural improvements."
  />
  <link rel="canonical" href={data.canonicalUrl} />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32">
    <!-- Header -->
    <header class="mb-16 md:mb-24">
      <h1
        class="text-4xl md:text-6xl font-header font-bold mb-6 bg-gradient-to-r from-theme-text to-theme-text/60 bg-clip-text text-transparent"
      >
        The Chronology
      </h1>

      <p class="text-theme-text max-w-2xl text-lg leading-relaxed font-body">
        Tracking the architectural evolution and protocol updates of Codex
        Cryptica. Witness the steady progression of the ultimate local-first
        lore engine.
      </p>
    </header>

    <!-- Entries stay at reading width; from lg a sticky release index uses the
         space beside them. -->
    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
      <div class="min-w-0 space-y-24">
        {#each data.releases as release, i}
          <section
            id="v{release.version}"
            class="group relative scroll-mt-20"
            in:fly={{ y: 20, delay: i * 50, duration: 500 }}
          >
            <!-- Version Badge & Date -->
            <div class="flex flex-wrap items-center gap-4 mb-6">
              <div
                class="px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 rounded text-micro font-mono text-theme-text uppercase tracking-[0.2em]"
              >
                v{release.version}
              </div>
              <time
                datetime={release.date}
                class="text-xs font-header uppercase tracking-widest text-theme-text"
              >
                {(() => {
                  // Parse "YYYY-MM-DD" safely without timezone shift
                  const [year, month, day] = release.date.split("-");
                  const d = new Date(
                    Date.UTC(Number(year), Number(month) - 1, Number(day)),
                  );
                  return d.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  });
                })()}
              </time>
              <span class="hidden md:block flex-1 h-px bg-theme-border/30"
              ></span>
              {#if release.type === "major" || release.type === "minor"}
                <span
                  class="text-micro font-mono text-theme-text uppercase tracking-widest"
                >
                  {release.type} protocol update
                </span>
              {/if}
            </div>

            <h2
              class="text-2xl md:text-3xl font-header font-bold mb-8 text-theme-text group-hover:text-theme-primary transition-colors"
            >
              {release.title}
            </h2>

            <ul class="space-y-6 max-w-3xl">
              {#each release.highlights as highlight}
                <li class="flex gap-4 group/item">
                  <span
                    class="icon-[lucide--sparkles] mt-1 h-5 w-5 shrink-0 text-theme-primary opacity-40 group-hover/item:opacity-100 transition-opacity"
                  ></span>
                  <p
                    class="text-theme-text text-lg leading-relaxed font-body group-hover/item:text-theme-text transition-colors"
                  >
                    {highlight}
                  </p>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>

      {#if data.releases.length > 1}
        <aside class="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <nav
            class="custom-scrollbar max-h-[calc(100vh-8rem)] [scrollbar-width:thin] overflow-y-auto rounded-xl border border-theme-border/60 bg-theme-surface/30 p-5 text-sm backdrop-blur-sm"
            aria-label="Releases"
            data-testid="changelog-index"
          >
            <p
              class="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-theme-text"
            >
              <span
                class="icon-[lucide--history] h-3.5 w-3.5 text-theme-primary"
                aria-hidden="true"
              ></span>
              Releases
            </p>
            <ul class="list-none border-l border-theme-border">
              {#each data.releases as release (release.version)}
                <li>
                  <a
                    href="#v{release.version}"
                    class="-ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary hover:text-theme-primary"
                  >
                    <span class="block font-mono text-xs text-theme-text"
                      >v{release.version}</span
                    >
                    <span
                      class="block font-header text-sm font-bold leading-snug text-theme-text"
                      >{release.title}</span
                    >
                  </a>
                </li>
              {/each}
            </ul>
          </nav>
        </aside>
      {/if}
    </div>

    {#if data.releases.length === 0}
      <div
        class="py-20 text-center border border-dashed border-theme-border rounded-lg bg-theme-surface/5"
      >
        <p class="text-theme-text font-mono">
          No records found in the chronology.
        </p>
      </div>
    {/if}

    <!-- Footer CTA -->
    <footer class="mt-32 pt-16 border-t border-theme-border/30 text-center">
      <h3 class="text-2xl font-header font-bold mb-6 text-theme-text">
        Ready to deploy?
      </h3>
      <p class="text-theme-text mb-12 max-w-xl mx-auto text-lg leading-relaxed">
        Your world is waiting for its next chapter. Secure your lore with Codex
        Cryptica today.
      </p>
      <a
        href="{basePath()}/?ref=changelog"
        class="inline-block px-12 py-5 bg-theme-primary text-theme-on-primary font-bold font-header text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_rgba(var(--color-theme-primary-rgb),0.3)] transition-all active:scale-95"
      >
        Enter Workspace
      </a>
    </footer>
  </div>
</div>

<style>
  @reference "../../../app.css";

  /* Smooth scrolling for anchor links */
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
