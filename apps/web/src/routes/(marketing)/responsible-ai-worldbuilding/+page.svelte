<script lang="ts">
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const articles = $derived(data.articles);

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does responsible AI mean for RPG worldbuilding?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It means keeping narrative control with the author. The AI assists with mechanical tasks — expanding notes, drafting entity descriptions, suggesting plot hooks — but it does not overwrite your canon, run without your permission, or store your campaign vault in a Codex-hosted database.",
        },
      },
      {
        "@type": "Question",
        name: "Can AI help with campaign prep without taking over?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You direct the Lore Oracle to fill templates, revise existing entries, or generate related entity suggestions. Every result lands in a sandbox draft. Nothing enters your saved lore without your explicit approval.",
        },
      },
      {
        "@type": "Question",
        name: "How does Codex keep AI drafts out of canon?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Codex separates AI drafts from saved files at an architectural level. Generated content lives in a temporary review state. You choose what to accept, edit, or discard. The AI cannot silently write to your vault.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use Codex Cryptica without AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Completely. The lore library, chronological timeline, interactive lore graph, entity templates, and local vault are all fully functional with AI switched off.",
        },
      },
      {
        "@type": "Question",
        name: "What does vault-aware AI mean?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vault-aware AI means the Oracle is grounded in the selected context from your vault rather than starting from a blank prompt alone. The active entity, linked notes, and any campaign-level context you have selected all shape the response.",
        },
      },
      {
        "@type": "Question",
        name: "What is the difference between context and memory?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Context is what you explicitly pass to the AI for a single query: the entity you are editing, the notes you have selected. Memory is persistent state across sessions. Codex uses context from your structured vault — frontmatter, linked entities, timelines — rather than relying on an opaque memory layer that can drift or hallucinate.",
        },
      },
      {
        "@type": "Question",
        name: "Can the Lore Oracle read my whole vault?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The Lore Oracle does not receive your entire vault by default. When you invoke it on an entity, it receives the active prompt, the current entity content and metadata, any linked entities you have included, and any campaign-level notes you have selected for that action. That context is used for a single request. Unselected notes stay local.",
        },
      },
    ],
  });

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
        "A campaign manager must be completely load-bearing without AI. If you turn the Oracle off, your lore library, chronological timelines, interactive graph, and local storage remain 100% functional.",
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
  {@html `<scr` + `ipt type="application/ld+json">${faqSchema}</scr` + `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Marketing Header -->
  <header
    class="w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-4">
      <a
        href="{cleanBase}/?utm_source=ra-pillar-logo&utm_medium=nav&utm_campaign=seo-funnel"
        class="flex items-center gap-2 group min-w-0"
        id="logo-link"
      >
        <span
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 shrink-0 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors whitespace-nowrap truncate"
        >
          Codex<span class="hidden sm:inline"> Cryptica</span>
        </span>
      </a>
      <nav
        class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest font-header text-theme-muted"
      >
        <a
          href="{cleanBase}/features"
          class="hover:text-theme-primary transition-colors">Features</a
        >
        <a
          href="{cleanBase}/blog"
          class="hover:text-theme-primary transition-colors">Devlog</a
        >
        <a
          href="{cleanBase}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div class="shrink-0">
        <a
          href="{cleanBase}/?utm_source=ra-pillar-nav&utm_medium=nav&utm_campaign=seo-funnel"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all whitespace-nowrap"
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
      Responsible AI
    </div>
    <h1
      class="text-4xl md:text-6xl font-extrabold font-header leading-tight mb-6 tracking-wide uppercase"
      id="hero-h1"
    >
      Responsible AI for <span class="text-theme-primary"
        >RPG Worldbuilding</span
      >
    </h1>
    <p
      class="text-lg md:text-xl text-theme-text/80 font-header max-w-2xl mx-auto leading-relaxed mb-12"
    >
      AI should help you build your world, not take authorship away from you.
      Learn how Codex Cryptica keeps narrative control in your hands.
    </p>

    <!-- At a Glance Section -->
    <div
      class="max-w-3xl mx-auto mb-12 p-8 bg-theme-surface/40 border border-theme-border/60 rounded-2xl backdrop-blur-md shadow-lg text-left"
    >
      <div class="flex items-center gap-3 mb-6">
        <span class="icon-[lucide--info] text-theme-primary w-6 h-6"></span>
        <h2 class="font-header font-bold text-lg uppercase tracking-wider">
          AI Principles at a Glance
        </h2>
      </div>
      <ul class="space-y-3 text-sm text-theme-text/85">
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>AI is optional</strong> — your core lore library, timelines,
            graph, and local vault continue to work without AI.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>Your vault is local-first</strong> — all files are stored directly
            in your browser's private filesystem.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>No silent execution</strong> — AI features only run when you
            explicitly choose to invoke them.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>Context-aware</strong> — the Lore Oracle builds suggestions from
            your selected campaign details, not hidden training datasets.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>Drafts are not canon</strong> — generated ideas live in a sandbox
            and never write to your files without approval.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>Human in the loop</strong> — you review, edit, and approve every
            single line that gets saved.</span
          >
        </li>
        <li class="flex items-start gap-3">
          <span
            class="icon-[lucide--check-circle-2] text-theme-primary w-5 h-5 shrink-0 mt-0.5"
          ></span>
          <span
            ><strong>Library first</strong> — Codex Cryptica is a private campaign
            manager first, and an AI assistant second.</span
          >
        </li>
      </ul>
    </div>

    <!-- Foundational Box -->
    <div
      class="max-w-3xl mx-auto mb-12 p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl backdrop-blur-md shadow-lg text-left"
    >
      <div class="flex items-center gap-3 mb-4">
        <span class="icon-[lucide--lock] text-theme-primary w-6 h-6"></span>
        <h2 class="font-header font-bold text-lg uppercase tracking-wider">
          Local-First Sovereignty
        </h2>
      </div>
      <p class="text-sm text-theme-text/75 leading-relaxed">
        True trust in digital worldbuilding requires full data ownership. Codex
        Cryptica is built around a local-first architecture. Your campaign vault
        lives in your browser's private filesystem (OPFS), running offline.
        Codex does not store your campaign vault in a Codex database. When you
        choose to utilize AI suggestions, your prompts are sent directly to your
        configured API client, ensuring your private notes remain under your
        domain.
      </p>
    </div>

    <!-- What AI Can See Section -->
    <div
      class="max-w-3xl mx-auto mb-16 p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl backdrop-blur-md shadow-lg text-left"
    >
      <div class="flex items-center gap-3 mb-6">
        <span class="icon-[lucide--eye] text-theme-primary w-6 h-6"></span>
        <h2 class="font-header font-bold text-lg uppercase tracking-wider">
          What the Oracle Can See
        </h2>
      </div>
      <p class="text-sm text-theme-muted mb-6 leading-relaxed">
        Codex does not upload your entire vault. When you choose to query the
        Lore Oracle, it works only with the specific campaign context needed for
        that action.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div
          class="p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-2"
        >
          <div
            class="font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5"
          >
            <span class="w-2 h-2 rounded-full bg-green-400"></span>
            Stays Local
          </div>
          <ul class="space-y-1 text-theme-muted">
            <li>• Vault Markdown files</li>
            <li>• Timeline histories</li>
            <li>• Local graph structures</li>
            <li>• Unselected campaign notes</li>
          </ul>
        </div>
        <div
          class="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-2"
        >
          <div
            class="font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5"
          >
            <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
            May Be Sent
          </div>
          <ul class="space-y-1 text-theme-muted">
            <li>• Active input prompt</li>
            <li>• Selected context notes</li>
            <li>• Draft text for revision</li>
            <li>• Linked entity templates</li>
          </ul>
        </div>
        <div
          class="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2"
        >
          <div
            class="font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5"
          >
            <span class="w-2 h-2 rounded-full bg-red-400"></span>
            Never Saved
          </div>
          <ul class="space-y-1 text-theme-muted text-[10px]">
            <li>• No hosted campaign database</li>
            <li>• No permanent chat files on our servers</li>
            <li>• No cloud logging of your private vault</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Articles List / Matrix Section -->
  <section
    class="border-t border-theme-border/30 bg-theme-surface/10 py-16 flex-grow"
  >
    <div class="max-w-5xl mx-auto px-6">
      <h2
        class="text-center font-header text-2xl uppercase tracking-[0.2em] text-theme-primary mb-4"
      >
        The 7 Pillars of Responsible AI
      </h2>
      <p
        class="text-center text-sm text-theme-muted mb-12 max-w-xl mx-auto leading-relaxed"
      >
        Read the devlog series detailing the design principles and technical
        implementations behind Codex's local-first AI system.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each principles as principle}
          {@const matchingArticle = articles.find(
            (a) => a.slug === principle.slug,
          )}
          <div
            class="flex flex-col p-6 bg-theme-surface/45 border border-theme-border/65 rounded-2xl shadow-sm backdrop-blur-sm hover:border-theme-primary/60 hover:-translate-y-1 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="{principle.icon} text-theme-primary w-6 h-6"></span>
              <span
                class="text-[10px] font-mono font-bold text-theme-muted uppercase tracking-widest"
                >Part {principle.step}</span
              >
            </div>

            <h3
              class="font-header font-bold text-base mb-2 tracking-wide text-theme-text"
            >
              {matchingArticle?.title || principle.title}
            </h3>

            <p class="text-theme-muted text-xs leading-relaxed mb-6 flex-grow">
              {principle.summary}
            </p>

            <div
              class="mt-auto pt-4 border-t border-theme-border/30 flex items-center justify-between"
            >
              <a
                href="{base}/blog/{principle.slug}"
                class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-primary hover:text-theme-text transition-colors group font-header"
              >
                Read Article
                <span
                  class="icon-[lucide--arrow-right] w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                ></span>
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section class="border-t border-theme-border/30 py-16">
    <div class="max-w-3xl mx-auto px-6">
      <h2
        class="text-center font-header text-2xl uppercase tracking-[0.2em] text-theme-primary mb-4"
      >
        Frequently Asked Questions
      </h2>
      <p
        class="text-center text-sm text-theme-muted mb-12 max-w-xl mx-auto leading-relaxed"
      >
        Common questions about responsible AI, vault privacy, and how the Lore
        Oracle works.
      </p>

      <div class="space-y-3">
        {#each [{ q: "What does responsible AI mean for RPG worldbuilding?", a: "It means keeping narrative control with the author. The AI assists with mechanical tasks — expanding notes, drafting entity descriptions, suggesting plot hooks — but it does not overwrite your canon, run without your permission, or store your campaign vault in a Codex-hosted database." }, { q: "Can AI help with campaign prep without taking over?", a: `Yes. You direct the Lore Oracle to fill templates, revise existing entries, or generate related entity suggestions. Every result lands in a sandbox draft. Nothing enters your saved lore without your explicit approval. Read more in <a href="${base}/blog/ai-campaign-prep-without-losing-your-voice" class="text-theme-primary hover:underline">Six Ways to Use AI in Campaign Prep Without Losing Your Voice</a>.` }, { q: "How does Codex keep AI drafts out of canon?", a: `Codex separates AI drafts from saved files at an architectural level. Generated content lives in a temporary review state. You choose what to accept, edit, or discard. The AI cannot silently write to your vault. See <a href="${base}/blog/drafts-are-not-canon" class="text-theme-primary hover:underline">Drafts Are Not Canon</a> for the full explanation.` }, { q: "Can I use Codex Cryptica without AI?", a: `Completely. The lore library, chronological timeline, interactive lore graph, entity templates, and local vault are all fully functional with AI switched off. AI is a layer on top of a working campaign manager, not a requirement for it. See <a href="${base}/blog/worldbuilding-tool-without-ai" class="text-theme-primary hover:underline">A Worldbuilding Tool Should Still Work Without AI</a>.` }, { q: "What does vault-aware AI mean?", a: "Vault-aware AI means the Oracle is grounded in the selected context from your vault rather than starting from a blank prompt alone. The active entity, linked notes, and any campaign-level context you have selected all shape the response." }, { q: "What is the difference between context and memory?", a: `Context is what you explicitly pass to the AI for a single query: the entity you are editing, the notes you have selected. Memory is persistent state across sessions. Codex uses context from your structured vault — frontmatter, linked entities, timelines — rather than relying on an opaque memory layer that can drift or hallucinate. Read more in <a href="${base}/blog/ai-slop-is-context-failure" class="text-theme-primary hover:underline">AI Slop Happens When the Tool Has No Memory</a>.` }, { q: "Can the Lore Oracle read my whole vault?", a: "No. The Lore Oracle does not receive your entire vault by default. When you invoke it on an entity, it receives the active prompt, the current entity content and metadata, any linked entities you have included, and any campaign-level notes you have selected for that action. That context is used for a single request. Unselected notes stay local." }] as faq}
          <details
            class="group border border-theme-border/60 rounded-xl bg-theme-surface/30 backdrop-blur-sm overflow-hidden"
          >
            <summary
              class="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-header font-bold text-sm text-theme-text hover:text-theme-primary transition-colors select-none"
            >
              {faq.q}
              <span
                class="icon-[lucide--chevron-down] w-4 h-4 shrink-0 text-theme-muted group-open:rotate-180 transition-transform duration-200"
                aria-hidden="true"
              ></span>
            </summary>
            <div
              class="px-6 pb-5 pt-1 text-sm text-theme-text/80 leading-relaxed border-t border-theme-border/30"
            >
              {@html faq.a}
            </div>
          </details>
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
        No email sign-up required to start. Build a private, local-first
        campaign vault and use AI only when you choose.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <a
          href="{base}/?utm_source=ra-pillar-footer&utm_medium=footer-cta&utm_campaign=seo-funnel"
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
          href="{cleanBase}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{cleanBase}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{cleanBase}/tools"
          class="hover:text-theme-primary transition-colors">Tools</a
        >
        <a
          href="{cleanBase}/sitemap.xml"
          class="hover:text-theme-primary transition-colors">Sitemap</a
        >
        <a
          href="{cleanBase}/llms.txt"
          class="hover:text-theme-primary transition-colors">LLM Docs</a
        >
      </div>
    </div>
  </footer>
</div>

<style>
  @reference "../../../app.css";
</style>
