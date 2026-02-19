<script lang="ts">
  import { FEATURE_HINTS } from "$lib/config/help-content";
  import { base } from "$app/paths";
  import { fly } from "svelte/transition";

  const features = Object.values(FEATURE_HINTS);
</script>

<svelte:head>
  <title>Features | Codex Cryptica</title>
  <meta
    name="description"
    content="Explore the advanced protocols of Codex Cryptica. AI image generation, knowledge graphs, era-based timelines, and local-first data management."
  />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300 overflow-y-auto"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="max-w-5xl mx-auto px-6 py-20">
    <!-- Header -->
    <header class="mb-20 text-center">
      <a
        href="{base}/"
        class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] mb-8 transition-colors"
      >
        <span class="icon-[lucide--arrow-left] w-3 h-3"></span>
        Return to Workspace
      </a>
      <h1
        class="text-5xl md:text-7xl font-bold font-header tracking-tight mb-6"
      >
        Operational <span class="text-theme-primary">Protocols</span>
      </h1>
      <p
        class="text-xl text-theme-muted max-w-2xl mx-auto leading-relaxed font-light"
      >
        Codex Cryptica is built on a foundation of privacy and intelligence.
        Explore the features that make it the ultimate choice for professional
        lore keepers.
      </p>
    </header>

    <!-- Features Grid -->
    <div class="grid md:grid-cols-2 gap-8 mb-32">
      {#each features as feature, i}
        <div
          class="p-10 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-primary/40 transition-all group relative overflow-hidden shadow-lg"
          style:background-image="var(--bg-texture-overlay)"
          in:fly={{ y: 20, delay: i * 50, duration: 500 }}
        >
          <!-- Accent Glow -->
          <div
            class="absolute -right-4 -top-4 w-32 h-32 bg-theme-primary/5 rounded-full blur-3xl group-hover:bg-theme-primary/10 transition-colors"
          ></div>

          <div class="relative z-10">
            <div class="flex items-center gap-5 mb-6">
              <div
                class="w-12 h-12 rounded-2xl bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20 group-hover:scale-110 transition-transform duration-300"
              >
                <span class="icon-[lucide--zap] text-theme-primary w-6 h-6"
                ></span>
              </div>
              <h2
                class="text-xl font-bold uppercase tracking-wider font-header text-theme-text"
              >
                {feature.title}
              </h2>
            </div>
            <p class="text-theme-muted leading-relaxed text-lg">
              {feature.content}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Technical Specs Section -->
    <section class="border-t border-theme-border/30 pt-24 mb-24">
      <div class="grid md:grid-cols-3 gap-16">
        <div>
          <h3
            class="text-[10px] font-black text-theme-primary uppercase tracking-[0.4em] mb-8"
          >
            Architecture
          </h3>
          <ul
            class="space-y-5 font-mono text-[11px] text-theme-muted uppercase tracking-wider"
          >
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Local-First (OPFS)
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Svelte 5 Runes
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Multi-Threaded
            </li>
          </ul>
        </div>
        <div>
          <h3
            class="text-[10px] font-black text-theme-primary uppercase tracking-[0.4em] mb-8"
          >
            Intelligence
          </h3>
          <ul
            class="space-y-5 font-mono text-[11px] text-theme-muted uppercase tracking-wider"
          >
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Google Gemini Pro
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Context-Aware RAG
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Lore Grounding
            </li>
          </ul>
        </div>
        <div>
          <h3
            class="text-[10px] font-black text-theme-primary uppercase tracking-[0.4em] mb-8"
          >
            Security
          </h3>
          <ul
            class="space-y-5 font-mono text-[11px] text-theme-muted uppercase tracking-wider"
          >
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Full E2E Privacy
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Zero-Cloud Default
            </li>
            <li class="flex items-center gap-4">
              <span class="w-2 h-2 bg-theme-primary/40 rounded-full"></span>
              Transparent Source
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section
      class="bg-theme-surface/30 border border-theme-border/20 rounded-3xl p-16 text-center relative overflow-hidden"
      style:background-image="var(--bg-texture-overlay)"
    >
      <div
        class="absolute inset-0 bg-theme-primary/5 pointer-events-none"
      ></div>
      <div class="relative z-10">
        <h2 class="text-4xl font-header font-bold mb-6 text-theme-text">
          Ready to initiate?
        </h2>
        <p
          class="text-theme-muted mb-12 max-w-xl mx-auto text-lg leading-relaxed"
        >
          Join the next generation of DMs. Start building your world with
          absolute privacy and unparalleled intelligence.
        </p>
        <a
          href="{base}/"
          class="inline-block px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_40px_var(--color-accent-primary)] transition-all active:scale-95 font-header"
        >
          Enter Workspace
        </a>
      </div>
    </section>
  </div>
</div>
