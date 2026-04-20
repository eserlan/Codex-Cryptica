<script lang="ts">
  import { base } from "$app/paths";
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
  <div class="max-w-4xl mx-auto px-6 py-20 md:py-32">
    <!-- Header -->
    <header class="mb-16 md:mb-24">
      <a
        href="{base}/"
        class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] mb-8 transition-colors"
      >
        <span class="icon-[lucide--arrow-left] w-3 h-3"></span>
        Return to Workspace
      </a>

      <h1
        class="text-4xl md:text-6xl font-header font-bold uppercase tracking-[0.2em] mb-6 bg-gradient-to-r from-theme-text to-theme-text/60 bg-clip-text text-transparent"
      >
        The Chronology
      </h1>
      <p class="text-theme-text/70 max-w-2xl text-lg leading-relaxed font-body">
        Tracking the architectural evolution and protocol updates of Codex
        Cryptica. Witness the steady progression of the ultimate local-first
        lore engine.
      </p>
    </header>

    <!-- Changelog Entries -->
    <div class="space-y-24">
      {#each data.releases as release, i}
        <section
          id="v{release.version}"
          class="group relative scroll-mt-20"
          in:fly={{ y: 20, delay: i * 50, duration: 500 }}
        >
          <!-- Version Badge & Date -->
          <div class="flex flex-wrap items-center gap-4 mb-6">
            <div
              class="px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 rounded text-[10px] font-mono text-theme-primary uppercase tracking-[0.2em]"
            >
              v{release.version}
            </div>
            <time
              datetime={release.date}
              class="text-xs font-header uppercase tracking-widest text-theme-muted"
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
            <span class="hidden md:block flex-1 h-px bg-theme-border/30"></span>
            {#if release.type === "major" || release.type === "minor"}
              <span
                class="text-[10px] font-mono text-theme-secondary uppercase tracking-widest"
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
                  class="text-theme-text/80 text-lg leading-relaxed font-body group-hover/item:text-theme-text transition-colors"
                >
                  {highlight}
                </p>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>

    {#if data.releases.length === 0}
      <div
        class="py-20 text-center border border-dashed border-theme-border rounded-lg bg-theme-surface/5"
      >
        <p class="text-theme-muted font-mono uppercase tracking-widest">
          No records found in the chronology.
        </p>
      </div>
    {/if}

    <!-- Footer CTA -->
    <footer class="mt-32 pt-16 border-t border-theme-border/30 text-center">
      <h3 class="text-2xl font-header font-bold mb-6 text-theme-text">
        Ready to deploy?
      </h3>
      <p
        class="text-theme-muted mb-12 max-w-xl mx-auto text-lg leading-relaxed"
      >
        Your world is waiting for its next chapter. Secure your lore with Codex
        Cryptica today.
      </p>
      <a
        href="{base}/"
        class="inline-block px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_rgba(var(--color-theme-primary-rgb),0.3)] transition-all active:scale-95"
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
