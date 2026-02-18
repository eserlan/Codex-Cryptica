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
  class="min-h-screen bg-black text-theme-text font-sans selection:bg-theme-primary selection:text-black"
>
  <div class="max-w-5xl mx-auto px-6 py-20">
    <!-- Header -->
    <header class="mb-20 text-center">
      <a
        href="{base}/"
        class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] mb-8 transition-colors"
      >
        <span class="icon-[lucide--arrow-left] w-3 h-3"></span>
        Return to Terminal
      </a>
      <h1 class="text-4xl md:text-6xl font-bold font-serif tracking-tight mb-6">
        Operational <span class="text-theme-primary">Protocols</span>
      </h1>
      <p class="text-lg text-theme-muted max-w-2xl mx-auto leading-relaxed">
        Codex Cryptica is built on a foundation of privacy and intelligence.
        Explore the features that make it the ultimate choice for professional
        lore keepers.
      </p>
    </header>

    <!-- Features Grid -->
    <div class="grid md:grid-cols-2 gap-6 mb-32">
      {#each features as feature, i}
        <div
          class="p-8 bg-theme-surface border border-theme-border rounded hover:border-theme-primary/40 transition-all group relative overflow-hidden"
          in:fly={{ y: 20, delay: i * 50, duration: 500 }}
        >
          <!-- Accent Glow -->
          <div
            class="absolute -right-4 -top-4 w-24 h-24 bg-theme-primary/5 rounded-full blur-3xl group-hover:bg-theme-primary/10 transition-colors"
          ></div>

          <div class="relative z-10">
            <div class="flex items-center gap-4 mb-6">
              <div
                class="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20"
              >
                <span class="icon-[lucide--zap] text-theme-primary w-5 h-5"
                ></span>
              </div>
              <h2
                class="text-xl font-bold uppercase tracking-wider font-mono text-theme-text"
              >
                {feature.title}
              </h2>
            </div>
            <p class="text-theme-muted leading-relaxed">
              {feature.content}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Technical Specs Section -->
    <section class="border-t border-theme-border/30 pt-20 mb-20">
      <div class="grid md:grid-cols-3 gap-12">
        <div>
          <h3
            class="text-xs font-black text-theme-primary uppercase tracking-[0.3em] mb-6"
          >
            Architecture
          </h3>
          <ul
            class="space-y-4 font-mono text-[11px] text-theme-muted uppercase"
          >
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Local-First (OPFS)
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Svelte 5 Runes
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Multi-Threaded Workers
            </li>
          </ul>
        </div>
        <div>
          <h3
            class="text-xs font-black text-theme-primary uppercase tracking-[0.3em] mb-6"
          >
            Intelligence
          </h3>
          <ul
            class="space-y-4 font-mono text-[11px] text-theme-muted uppercase"
          >
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Google Gemini Pro
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Context-Aware RAG
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Recursive Analysis
            </li>
          </ul>
        </div>
        <div>
          <h3
            class="text-xs font-black text-theme-primary uppercase tracking-[0.3em] mb-6"
          >
            Security
          </h3>
          <ul
            class="space-y-4 font-mono text-[11px] text-theme-muted uppercase"
          >
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              End-to-End Privacy
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Zero-Cloud Dependency
            </li>
            <li class="flex items-center gap-3">
              <span class="w-1.5 h-1.5 bg-theme-primary rounded-full"></span>
              Transparent Source
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section
      class="bg-theme-primary/5 border border-theme-primary/20 rounded-2xl p-12 text-center"
    >
      <h2 class="text-3xl font-serif font-bold mb-6 text-theme-text">
        Ready to initiate?
      </h2>
      <p class="text-theme-muted mb-10 max-w-lg mx-auto">
        Join the next generation of DMs. Start building your world with absolute
        privacy and unparalleled intelligence.
      </p>
      <a
        href="{base}/"
        class="inline-block px-10 py-4 bg-theme-primary text-black font-bold uppercase tracking-widest text-xs rounded hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95"
      >
        Access System
      </a>
    </section>
  </div>
</div>
