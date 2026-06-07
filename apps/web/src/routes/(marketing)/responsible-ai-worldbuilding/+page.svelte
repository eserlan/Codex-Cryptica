<script lang="ts">
  import { base } from "$app/paths";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const articles = $derived(data.articles);

  const principles = [
    {
      step: 1,
      title: "AI Is Not the Author",
      summary:
        "AI should not become the storyteller. Codex Cryptica positions the Lore Oracle as a co-writer and mechanical helper, leaving the narrative soul and canon design strictly to you.",
      slug: "lore-oracle-not-the-author",
      icon: "icon-[lucide--bot]",
    },
    {
      step: 2,
      title: "AI Must Be Optional",
      summary:
        "A campaign manager must be completely load-bearing without AI. If you turn the Oracle off, your wiki, chronological timelines, interactive graph, and local storage remain 100% functional.",
      slug: "worldbuilding-tool-without-ai",
      icon: "icon-[lucide--wifi-off]",
    },
    {
      step: 3,
      title: "Lore Before Language",
      summary:
        "Generic AI slop is a context failure. The Oracle reads from your active campaign context and surrounding notes to draft entries that fit your world, rather than pulling generic fantasy tropes.",
      slug: "worldbuilding-ai-needs-your-lore",
      icon: "icon-[lucide--sparkles]",
    },
    {
      step: 4,
      title: "Drafts Are Not Canon",
      summary:
        "AI suggestions live in a sandbox. Codex separates generated drafts from your saved files, ensuring nothing enters your permanent lore database without your explicit approval.",
      slug: "drafts-are-not-canon",
      icon: "icon-[lucide--shield-check]",
    },
    {
      step: 5,
      title: "Augment, Don't Replace",
      summary:
        "Use AI to expand brief notes, fill entity templates, and speed up mechanical prep. It acts as an assistant that takes care of the blank-page friction, keeping your creative voice intact.",
      slug: "ai-campaign-prep-without-losing-your-voice",
      icon: "icon-[lucide--file-text]",
    },
    {
      step: 6,
      title: "Continuous Memory",
      summary:
        "A campaign is a living history. A tool with no memory cannot maintain continuity. Codex leverages structured frontmatter and campaign timeline records to ensure AI suggestions stay consistent over sessions.",
      slug: "ai-slop-is-context-failure",
      icon: "icon-[lucide--network]",
    },
    {
      step: 7,
      title: "AI as the Editor",
      summary:
        "Revision is where the Oracle excels. Direct the AI to refine draft entries, rephrase descriptions, or suggest plot complications based on existing lore, acting as your editor rather than author.",
      slug: "revising-your-lore-with-the-oracle",
      icon: "icon-[lucide--pencil]",
    },
  ];
</script>

<svelte:head>
  <title>Responsible AI for RPG Worldbuilding | Codex Cryptica</title>
  <meta
    name="description"
    content="Read the Responsible AI series on worldbuilding. Learn why campaign notes should remain private, why drafts are not canon, and how to use local-first AI without losing your voice."
  />
  <meta
    name="keywords"
    content="responsible AI, RPG worldbuilding, AI dungeon master, local-first campaign manager, Codex Cryptica"
  />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta
    property="og:title"
    content="Responsible AI for RPG Worldbuilding | Codex Cryptica"
  />
  <meta
    property="og:description"
    content="Read the Responsible AI series on worldbuilding. Learn why campaign notes should remain private, why drafts are not canon, and how to use local-first AI without losing your voice."
  />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content="https://codexcryptica.com/logo.png" />
  <meta name="twitter:card" content="summary" />
  <meta
    name="twitter:title"
    content="Responsible AI for RPG Worldbuilding | Codex Cryptica"
  />
  <meta
    name="twitter:description"
    content="Read the Responsible AI series on worldbuilding. Learn why campaign notes should remain private, why drafts are not canon, and how to use local-first AI without losing your voice."
  />
  <meta name="twitter:image" content="https://codexcryptica.com/logo.png" />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Marketing Header -->
  <header
    class="w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2 group" id="logo-link">
        <span
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors"
        >
          Codex Cryptica
        </span>
      </a>
      <nav
        class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest font-header text-theme-muted"
      >
        <a
          href="{base}/features"
          class="hover:text-theme-primary transition-colors">Features</a
        >
        <a href="{base}/blog" class="hover:text-theme-primary transition-colors"
          >Devlog</a
        >
        <a
          href="{base}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div>
        <a
          href="{base}/"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
          id="nav-cta-btn"
        >
          Open Codex
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
    <div
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-theme-primary/10 border border-theme-primary/20 text-theme-primary mb-8 uppercase tracking-wider"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse"
      ></span>
      Responsible AI Pillar
    </div>
    <h1
      class="text-4xl md:text-6xl font-extrabold font-header leading-tight mb-6 tracking-wide"
      id="hero-h1"
    >
      Responsible AI for <span
        class="text-theme-primary bg-gradient-to-r from-theme-primary to-theme-accent bg-clip-text text-transparent"
        >RPG Worldbuilding</span
      >
    </h1>
    <p
      class="text-lg md:text-xl text-theme-text/80 font-header max-w-2xl mx-auto leading-relaxed mb-8"
    >
      How to build campaign notes with an AI assistant that respects your canon,
      navigates your notes, and leaves authorship in your hands.
    </p>

    <!-- Foundational Box -->
    <div
      class="max-w-3xl mx-auto mb-16 p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl backdrop-blur-md shadow-lg text-left"
    >
      <div class="flex items-center gap-3 mb-4">
        <span class="icon-[lucide--lock] text-theme-primary w-6 h-6"></span>
        <h2 class="font-header font-bold text-lg uppercase tracking-wider">
          The Foundation: Local-First Sovereignty
        </h2>
      </div>
      <p class="text-sm text-theme-text/75 leading-relaxed">
        True trust in digital worldbuilding requires full data ownership. Codex
        Cryptica is built around a local-first architecture. Your campaign vault
        lives entirely in your browser's private filesystem (OPFS), running
        offline with zero server data lock-in. When you choose to utilize AI
        suggestions, your prompts are sent directly to your configured API
        client, meaning your raw notes never touch Codex databases.
      </p>
    </div>
  </section>

  <!-- Articles List / Matrix Section -->
  <section
    class="border-t border-theme-border/30 bg-theme-surface/10 py-16 flex-grow"
  >
    <div class="max-w-5xl mx-auto px-6">
      <h2
        class="text-center font-header text-2xl uppercase tracking-[0.2em] text-theme-primary mb-12"
      >
        The 7 Pillars of Responsible AI
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each principles as principle}
          {@const matchingArticle = articles.find(
            (a) => a.slug === principle.slug,
          )}
          <div
            class="flex flex-col p-6 bg-theme-surface/40 border border-theme-border/65 rounded-2xl shadow-md backdrop-blur-sm hover:border-theme-primary/60 hover:-translate-y-1 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="{principle.icon} text-theme-primary w-8 h-8"></span>
              <span
                class="text-xs font-mono font-bold text-theme-muted uppercase tracking-widest"
                >Part {principle.step}</span
              >
            </div>

            <h3
              class="font-header font-bold text-lg mb-2 tracking-wide text-theme-text"
            >
              {matchingArticle?.title || principle.title}
            </h3>

            <p
              class="text-theme-text/70 text-xs leading-relaxed mb-6 flex-grow"
            >
              {principle.summary}
            </p>

            <div
              class="mt-auto pt-4 border-t border-theme-border/30 flex items-center justify-between"
            >
              <a
                href="{base}/blog/{principle.slug}"
                class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-theme-primary hover:text-theme-text transition-colors group"
              >
                Read Article
                <span
                  class="icon-[lucide--arrow-right] w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                ></span>
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA Panel -->
  <section
    class="border-t border-theme-border/30 bg-gradient-to-b from-theme-bg to-theme-surface/30 py-16 text-center"
  >
    <div class="max-w-2xl mx-auto px-6 font-header">
      <h2 class="text-3xl font-extrabold mb-4 uppercase tracking-wider">
        Ready to Build Your World?
      </h2>
      <p class="text-theme-muted text-sm leading-relaxed mb-8 max-w-md mx-auto">
        Create a private, local-first campaign vault today. No email sign-up
        required, no subscription paywalls, just secure storytelling tools.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <a
          href="{base}/"
          class="px-8 py-3.5 bg-theme-primary text-theme-bg font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
          id="footer-cta-btn"
        >
          Launch Codex Cryptica
        </a>
        <a
          href="{base}/blog"
          class="px-8 py-3.5 border border-theme-border hover:border-theme-primary/60 text-theme-text font-bold uppercase tracking-widest text-xs rounded-xl transition-all"
        >
          Explore All Devlogs
        </a>
      </div>
    </div>
  </section>

  <!-- Marketing Footer -->
  <footer
    class="border-t border-theme-border/60 bg-theme-surface/20 px-6 py-8 mt-auto text-center text-[10px] text-theme-muted tracking-wider uppercase font-header"
  >
    <div
      class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <div>© 2026 Codex Cryptica. All rights reserved.</div>
      <div class="flex gap-6">
        <a
          href="{base}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{base}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{base}/tools"
          class="hover:text-theme-primary transition-colors">Tools</a
        >
        <a
          href="{base}/sitemap.xml"
          class="hover:text-theme-primary transition-colors">Sitemap</a
        >
        <a
          href="{base}/llms.txt"
          class="hover:text-theme-primary transition-colors">LLM Docs</a
        >
      </div>
    </div>
  </footer>
</div>

<style>
  @reference "../../../app.css";
</style>
