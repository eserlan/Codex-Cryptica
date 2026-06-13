<script lang="ts">
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { fly } from "svelte/transition";
  import { safeJsonLd } from "$lib/utils/json-ld";

  async function startDemo(theme: string) {
    if (browser) {
      const { demoService } = await import("$lib/services/demo");
      await demoService.startDemo(theme);
    }
  }

  // FAQ Schema JSON-LD
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Codex Cryptica really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Codex Cryptica is a completely free, local-first campaign manager. All campaign files, databases, and note storage run locally inside your browser using the Origin Private File System (OPFS), requiring no paid subscriptions, accounts, or advertisements.",
        },
      },
      {
        "@type": "Question",
        name: "Where is my campaign data stored?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your campaign notes and worldbuilding files are stored locally on your device's hard drive using the browser's Origin Private File System (OPFS). Codex Cryptica does not host, sync, or upload your campaign data to external servers, guaranteeing complete privacy.",
        },
      },
      {
        "@type": "Question",
        name: "Does this RPG campaign manager work offline?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Because Codex Cryptica is built as a local-first application, you can view your interactive relationship maps, track game timelines, and edit all campaign notes completely offline at the table without any network connection.",
        },
      },
      {
        "@type": "Question",
        name: "How does the AI GM assistant work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Codex Cryptica's AI Lore Oracle assistant integrates directly with your own Google Gemini API key, which can be configured securely in the settings panel. Codex Cryptica also provides a shared system proxy for quick, free trials of the AI co-author features.",
        },
      },
    ],
  };

  const faqSchemaString = $derived(safeJsonLd(faqSchema));

  const capabilities = [
    {
      title: "Linked Knowledge Graph",
      desc: "Connect characters, factions, and cities visually. Navigate your campaign lore like a local wiki.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Tactical Mapping",
      desc: "Pin campaign locations directly on interactive high-res maps with customizable spatial markers.",
      icon: "icon-[lucide--map]",
    },
    {
      title: "Era-Based Timelines",
      desc: "Track world history, player quest logs, and faction agendas across chronological eras.",
      icon: "icon-[lucide--calendar-days]",
    },
    {
      title: "AI-Powered Lore Oracle",
      desc: "Co-author stories, parse draft summaries, and generate visual character art using local Gemini models.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "Scratchpad & Notes",
      desc: "Jot down session logs, inventory, and rule lookups in a fast, hotkey-triggerable side panel.",
      icon: "icon-[lucide--sticky-note]",
    },
    {
      title: "Total Local Privacy",
      desc: "No remote databases, login prompt, or email lists. Your notes stay encrypted on your hard drive.",
      icon: "icon-[lucide--shield-check]",
    },
  ];

  const faqs = faqSchema.mainEntity.map((item) => ({
    q: item.name,
    a: item.acceptedAnswer.text,
  }));
</script>

<svelte:head>
  <title>Free RPG Campaign Manager & Lore Vault | Codex Cryptica</title>
  <meta
    name="description"
    content="Codex Cryptica is a free, local-first campaign manager and notes app for game masters. Map campaign lore, linked graphs, interactive maps, and timelines privately."
  />
  <meta name="robots" content="index, follow" />
  <link
    rel="canonical"
    href="https://codexcryptica.com/free-rpg-campaign-manager"
  />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta
    property="og:title"
    content="Free RPG Campaign Manager & Lore Vault | Codex Cryptica"
  />
  <meta
    property="og:description"
    content="Codex Cryptica is a free, local-first campaign manager and notes app for game masters. Map campaign lore, linked graphs, interactive maps, and timelines privately."
  />
  <meta
    property="og:url"
    content="https://codexcryptica.com/free-rpg-campaign-manager"
  />
  <meta property="og:image" content="https://codexcryptica.com/logo.png" />
  <meta name="twitter:card" content="summary" />
  <meta
    name="twitter:title"
    content="Free RPG Campaign Manager & Lore Vault | Codex Cryptica"
  />
  <meta
    name="twitter:description"
    content="Codex Cryptica is a free, local-first campaign manager and notes app for game masters. Map campaign lore, linked graphs, interactive maps, and timelines privately."
  />
  <meta name="twitter:image" content="https://codexcryptica.com/logo.png" />
  <link rel="help" href="{base}/llms.txt" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${faqSchemaString}</scr` +
    `ipt>`}
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300 overflow-y-auto"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="max-w-6xl mx-auto px-6 py-16 md:py-24">
    <!-- Header Navigation -->
    <nav class="flex justify-between items-center mb-16">
      <a
        href="{base}/?ref=landing"
        class="font-mono text-xs uppercase tracking-[0.2em] text-theme-primary hover:opacity-80 transition-opacity flex items-center gap-2"
      >
        <span class="icon-[lucide--shield] w-4 h-4"></span>
        Codex Cryptica
      </a>
      <div class="flex gap-6">
        <a
          href="{base}/features"
          class="text-xs uppercase font-mono tracking-widest hover:text-theme-primary transition-colors"
          >Features</a
        >
        <a
          href="{base}/blog"
          class="text-xs uppercase font-mono tracking-widest hover:text-theme-primary transition-colors"
          >Blog</a
        >
      </div>
    </nav>

    <!-- Hero Section -->
    <header class="text-center mb-24 max-w-4xl mx-auto">
      <h1
        class="text-5xl md:text-7xl font-bold font-header tracking-tight mb-8 leading-tight"
      >
        Free RPG <span class="text-theme-primary">Campaign Manager</span> & Lore Vault
      </h1>
      <p
        class="text-lg md:text-2xl text-theme-muted mb-12 font-light leading-relaxed"
      >
        Stop fighting scattered folders. Organize campaign notes, characters,
        locations, and timelines inside a private, local-first database with
        connected knowledge graphs.
      </p>

      <div class="flex flex-wrap justify-center gap-4">
        <a
          href="{base}/?ref=landing"
          class="px-8 py-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-lg hover:bg-theme-primary/95 transition-all shadow-lg hover:shadow-theme-primary/20 active:scale-95"
        >
          Enter the Codex
        </a>
        <button
          type="button"
          onclick={() => startDemo("fantasy")}
          class="px-8 py-4 bg-theme-surface border border-theme-border text-theme-text font-bold uppercase font-header tracking-widest text-xs rounded-lg hover:border-theme-primary/60 transition-all active:scale-95"
        >
          Launch Fantasy Demo
        </button>
      </div>
    </header>

    <!-- Product Mockup Visual -->
    <section class="mb-32 relative group" in:fly={{ y: 30, duration: 600 }}>
      <div
        class="absolute -inset-1 bg-gradient-to-r from-theme-primary/20 to-theme-accent/20 rounded-3xl blur-3xl opacity-50 group-hover:opacity-75 transition duration-1000"
      ></div>
      <div
        class="relative bg-theme-surface/60 border border-theme-border/80 rounded-3xl overflow-hidden shadow-2xl"
      >
        <img
          src="{base}/images/rpg-vault-mockup.png"
          alt="Codex Cryptica RPG campaign manager dashboard showing linked characters, locations, and factions inside a knowledge graph network."
          class="w-full h-auto object-cover opacity-95 group-hover:scale-[1.01] transition-transform duration-700"
        />
      </div>
    </section>

    <!-- Capabilities Grid -->
    <section class="mb-32">
      <h2 class="text-3xl md:text-5xl font-header font-bold text-center mb-16">
        Everything you need to run your campaign
      </h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each capabilities as capability}
          <div
            class="p-8 bg-theme-surface/50 border border-theme-border rounded-2xl relative overflow-hidden group hover:border-theme-primary/45 transition-colors"
          >
            <div
              class="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20 mb-6 group-hover:scale-110 transition-transform duration-300"
            >
              <span class="{capability.icon} text-theme-primary w-5 h-5"></span>
            </div>
            <h3 class="text-lg font-bold font-header tracking-wide mb-3">
              {capability.title}
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              {capability.desc}
            </p>
          </div>
        {/each}
      </div>
    </section>

    <!-- The Alternative Table (GEO Target) -->
    <section class="mb-32">
      <h2 class="text-3xl md:text-5xl font-header font-bold text-center mb-6">
        Why Codex Cryptica?
      </h2>
      <p
        class="text-theme-muted text-center max-w-xl mx-auto mb-16 leading-relaxed"
      >
        How our structured, local-first database compares to traditional note
        tools or spreadsheets.
      </p>

      <div
        class="border border-theme-border/60 bg-theme-surface/30 rounded-2xl overflow-hidden backdrop-blur-sm"
      >
        <table class="w-full border-collapse text-left text-sm md:text-base">
          <thead>
            <tr
              class="border-b border-theme-border bg-theme-surface/50 font-header font-bold uppercase tracking-wider text-theme-muted text-xs"
            >
              <th class="p-6">Feature</th>
              <th class="p-6">Spreadsheets / Docs</th>
              <th class="p-6 text-theme-primary">Codex Cryptica</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="border-b border-theme-border/40 hover:bg-theme-surface/10 transition-colors"
            >
              <td class="p-6 font-bold">Lore Relationships</td>
              <td class="p-6 text-theme-muted"
                >Flat list or links that break easily.</td
              >
              <td
                class="p-6 font-semibold text-theme-primary flex items-center gap-2"
              >
                <span
                  class="icon-[lucide--check-circle-2] text-theme-primary w-4 h-4"
                ></span>
                Interactive Graph & Auto-Backlinks
              </td>
            </tr>
            <tr
              class="border-b border-theme-border/40 hover:bg-theme-surface/10 transition-colors"
            >
              <td class="p-6 font-bold">Offline Availability</td>
              <td class="p-6 text-theme-muted"
                >Varies; cloud documents lag or fail.</td
              >
              <td
                class="p-6 font-semibold text-theme-primary flex items-center gap-2"
              >
                <span
                  class="icon-[lucide--check-circle-2] text-theme-primary w-4 h-4"
                ></span>
                100% Offline-capable (Client-first)
              </td>
            </tr>
            <tr
              class="border-b border-theme-border/40 hover:bg-theme-surface/10 transition-colors"
            >
              <td class="p-6 font-bold">Data Privacy</td>
              <td class="p-6 text-theme-muted"
                >Stored on cloud servers; data scraped.</td
              >
              <td
                class="p-6 font-semibold text-theme-primary flex items-center gap-2"
              >
                <span
                  class="icon-[lucide--check-circle-2] text-theme-primary w-4 h-4"
                ></span>
                Private local-first files (OPFS)
              </td>
            </tr>
            <tr class="hover:bg-theme-surface/10 transition-colors">
              <td class="p-6 font-bold">Chronology</td>
              <td class="p-6 text-theme-muted"
                >Manually typed calendars; easily disjointed.</td
              >
              <td
                class="p-6 font-semibold text-theme-primary flex items-center gap-2"
              >
                <span
                  class="icon-[lucide--check-circle-2] text-theme-primary w-4 h-4"
                ></span>
                Era-based, timeline integrated
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="mb-32 max-w-3xl mx-auto">
      <h2 class="text-3xl md:text-5xl font-header font-bold text-center mb-16">
        Frequently Asked Questions
      </h2>
      <div class="space-y-8">
        {#each faqs as faq}
          <div class="border-b border-theme-border pb-6">
            <h3 class="text-lg font-bold font-header mb-3 text-theme-primary">
              {faq.q}
            </h3>
            <p class="text-theme-muted leading-relaxed text-sm md:text-base">
              {faq.a}
            </p>
          </div>
        {/each}
      </div>
    </section>

    <!-- CTA Section -->
    <section
      class="bg-theme-surface/30 border border-theme-border/20 rounded-3xl p-16 text-center relative overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-theme-primary/5 pointer-events-none"
      ></div>
      <div class="relative z-10">
        <h2 class="text-4xl font-header font-bold mb-6">
          Take control of your campaign notes
        </h2>
        <p
          class="text-theme-muted mb-12 max-w-xl mx-auto text-lg leading-relaxed"
        >
          Create your first vault today. Drag and drop locations, link quests,
          and write your story in absolute local privacy.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <a
            href="{base}/?ref=landing"
            class="px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_40px_var(--color-accent-primary)] transition-all active:scale-95"
          >
            Create Your Vault
          </a>
        </div>
      </div>
    </section>

    <!-- Footer Links (GEO internal links) -->
    <footer
      class="mt-32 pt-8 border-t border-theme-border/40 text-center text-xs text-theme-muted space-y-4"
    >
      <div class="flex flex-wrap justify-center gap-6">
        <a href="{base}/" class="hover:text-theme-primary transition-colors"
          >RPG campaign manager</a
        >
        <a
          href="{base}/worldbuilding-tool"
          class="hover:text-theme-primary transition-colors"
          >worldbuilding tool</a
        >
        <a
          href="{base}/ai-rpg-campaign-manager"
          class="hover:text-theme-primary transition-colors"
          >AI RPG Campaign Manager</a
        >
        <a
          href="{base}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors"
          >DnD NPC Generator</a
        >
      </div>
      <p>
        © {new Date().getFullYear()} Codex Cryptica. Your world is your own.
      </p>
    </footer>
  </div>
</div>
