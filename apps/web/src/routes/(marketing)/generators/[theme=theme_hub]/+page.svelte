<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { safeJsonLd } from "$lib/utils/json-ld";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { hubContext } from "$lib/stores/hub-context.svelte";
  import type { ThemeSlug } from "./+page";

  const { data } = $props();

  const origin = "https://codexcryptica.com";

  type GeneratorCard = {
    slug: string;
    label: string;
    summary: string;
    icon: string;
  };

  type ThemeConfig = {
    label: string;
    localStorageId: string;
    eyebrow: string;
    intro: string;
    metaTitle: string;
    metaDescription: string;
    cards: GeneratorCard[];
  };

  const parametricCards: GeneratorCard[] = [
    {
      slug: "npc",
      label: "NPC Generator",
      summary:
        "Generate fully realised NPCs with ancestry, role, personality, secrets, and plot hooks.",
      icon: "icon-[lucide--user-round-plus]",
    },
    {
      slug: "faction",
      label: "Faction Generator",
      summary:
        "Build organisations with agendas, internal conflicts, notable members, and power structures.",
      icon: "icon-[lucide--flag]",
    },
    {
      slug: "quest",
      label: "Quest Generator",
      summary:
        "Create adventure hooks with goals, complications, rewards, and dramatic twists.",
      icon: "icon-[lucide--scroll]",
    },
    {
      slug: "names",
      label: "Name Generator",
      summary:
        "Generate character, place, faction, and item names tuned to your genre and cultural style.",
      icon: "icon-[lucide--pen-line]",
    },
    {
      slug: "settlement",
      label: "Settlement Generator",
      summary:
        "Draft towns, cities, and outposts with demographics, districts, power factions, and hooks.",
      icon: "icon-[lucide--building-2]",
    },
    {
      slug: "nation",
      label: "Nation Generator",
      summary:
        "Build nations and power blocs with government, economy, military, and foreign relations.",
      icon: "icon-[lucide--globe]",
    },
  ];

  const fantasyOnlyCards: GeneratorCard[] = [
    {
      slug: "dnd-npc",
      label: "D&D NPC Generator",
      summary:
        "Create a D&D-ready NPC with ancestry, role, personality, secret, faction tie, and plot hook.",
      icon: "icon-[lucide--shield]",
    },
    {
      slug: "magic-item",
      label: "Magic Item Generator",
      summary:
        "Forge unique artefacts, cursed relics, and legendary weapons with lore and mechanics.",
      icon: "icon-[lucide--wand-sparkles]",
    },
    {
      slug: "kingdom",
      label: "Kingdom Generator",
      summary:
        "Construct realms with rulers, noble houses, military strength, and political intrigue.",
      icon: "icon-[lucide--crown]",
    },
    {
      slug: "pantheon-generator",
      label: "Pantheon Generator",
      summary:
        "Build a pantheon with alliances, rivalries, cosmic conflicts, and member deities.",
      icon: "icon-[lucide--sun]",
    },
  ];

  const themeConfig: Record<ThemeSlug, ThemeConfig> = {
    fantasy: {
      label: "Fantasy",
      localStorageId: "fantasy",
      eyebrow: "Swords, Sorcery & Myth",
      intro:
        "Build the high-fantasy worlds your players will never forget. From legendary kingdoms and divine pantheons to morally ambiguous guilds and cursed artefacts — every generator is tuned for classic fantasy campaigns.",
      metaTitle:
        "Fantasy RPG Generators — NPC, Faction, Kingdom & More | Codex Cryptica",
      metaDescription:
        "Free fantasy RPG generators for tabletop GMs. Create NPCs, factions, kingdoms, magic items, pantheons, quests, and names for your fantasy campaign. No login required.",
      cards: [...parametricCards, ...fantasyOnlyCards],
    },
    cyberpunk: {
      label: "Cyberpunk",
      localStorageId: "cyberpunk",
      eyebrow: "Neon, Megacorps & Chrome",
      intro:
        "Neon-drenched streets, corporate warfare, and augmented outlaws. Generate megacorp factions, street-level fixers, and underground settlements for your cyberpunk campaign — all pre-tuned to the genre.",
      metaTitle:
        "Cyberpunk RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free cyberpunk RPG generators for tabletop GMs. Create fixers, megacorp factions, settlements, quest hooks, and names for your cyberpunk campaign. No login required.",
      cards: parametricCards,
    },
    "sci-fi": {
      label: "Sci-Fi",
      localStorageId: "scifi",
      eyebrow: "Space Opera & the Stars",
      intro:
        "Explore the galaxy with generators built for space opera and hard sci-fi. Draft alien factions, starfaring NPCs, frontier settlements, and interstellar political blocs for your campaign.",
      metaTitle:
        "Sci-Fi RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free sci-fi RPG generators for tabletop GMs. Create alien NPCs, space factions, frontier settlements, quest hooks, and names for your sci-fi campaign. No login required.",
      cards: parametricCards,
    },
    "post-apocalyptic": {
      label: "Post-Apocalyptic",
      localStorageId: "apocalyptic",
      eyebrow: "Ruins, Wastes & Survivors",
      intro:
        "The world ended. Now build what came after. Generate survivor factions, wasteland settlements, desperate NPCs, and brutal quest hooks for your post-apocalyptic campaign.",
      metaTitle:
        "Post-Apocalyptic RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free post-apocalyptic RPG generators for tabletop GMs. Create survivor factions, wasteland settlements, scavenger NPCs, and quest hooks. No login required.",
      cards: parametricCards,
    },
    modern: {
      label: "Modern",
      localStorageId: "modern",
      eyebrow: "Conspiracies & City Streets",
      intro:
        "Secret societies, government cover-ups, and shadowy organisations lurk beneath the surface. Generate modern-era NPCs, conspiracy factions, urban settlements, and investigation hooks.",
      metaTitle:
        "Modern RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free modern RPG generators for tabletop GMs. Create conspiracy factions, urban settlements, modern NPCs, and investigation hooks. No login required.",
      cards: parametricCards,
    },
    vampire: {
      label: "Vampire",
      localStorageId: "horror",
      eyebrow: "Gothic Noir & the Eternal Night",
      intro:
        "Ancient bloodlines, forbidden pacts, and courts of the undead. Generate vampire clans, gothic factions, shadowy NPCs, and dark quest hooks for your vampire or gothic horror campaign.",
      metaTitle:
        "Vampire RPG Generators — NPC, Clan, Quest & More | Codex Cryptica",
      metaDescription:
        "Free vampire RPG generators for tabletop GMs. Create vampire clans, gothic factions, undead NPCs, and dark quest hooks for your horror campaign. No login required.",
      cards: parametricCards,
    },
  };

  const config = $derived(themeConfig[data.theme]);
  const canonicalUrl = $derived(`${origin}/generators/${data.theme}`);

  const collectionPageJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: config.metaTitle,
      description: config.metaDescription,
      url: canonicalUrl,
      inLanguage: "en",
    }),
  );

  const itemListJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${config.label} RPG Generators`,
      description: config.metaDescription,
      url: canonicalUrl,
      numberOfItems: config.cards.length,
      itemListElement: config.cards.map((card, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: card.label,
        description: card.summary,
        url: `${origin}/generators/${card.slug}`,
      })),
    }),
  );

  const breadcrumbJsonLd = $derived(
    safeJsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Codex Cryptica",
          item: origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "RPG Generators",
          item: `${origin}/generators`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: `${config.label} Generators`,
          item: canonicalUrl,
        },
      ],
    }),
  );

  onMount(() => {
    themeStore.setTheme(config.localStorageId);
  });
</script>

<svelte:head>
  <title>{config.metaTitle}</title>
  <meta name="description" content={config.metaDescription} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="help" href="{base}/llms.txt" />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={config.metaTitle} />
  <meta property="og:description" content={config.metaDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content="{origin}/logo.png" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={config.metaTitle} />
  <meta name="twitter:description" content={config.metaDescription} />
  <meta name="twitter:image" content="{origin}/logo.png" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${collectionPageJsonLd}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${itemListJsonLd}</scr` +
    `ipt>`}
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${breadcrumbJsonLd}</scr` +
    `ipt>`}
</svelte:head>

<main
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
    <div class="max-w-6xl mx-auto">
      <a
        href="{base}/generators"
        class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors mb-8"
      >
        <span class="icon-[lucide--arrow-left] h-4 w-4"></span>
        All Generators
      </a>
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          {config.eyebrow}
        </p>
        <h1
          class="font-header text-4xl md:text-5xl font-extrabold tracking-wide uppercase mb-5"
        >
          {config.label} RPG Generators
        </h1>
        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          {config.intro}
        </p>
      </div>
    </div>
  </section>

  <div class="max-w-6xl mx-auto px-6 py-12 md:py-16">
    <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each config.cards as card (card.slug)}
        <li>
          <a
            href="{base}/generators/{card.slug}"
            onclick={() => {
              themeStore.setTheme(config.localStorageId);
              hubContext.set(data.theme);
            }}
            class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
          >
            <span class="{card.icon} h-5 w-5 text-theme-primary mb-4 block"
            ></span>
            <span
              class="block font-header text-sm font-bold uppercase tracking-wider mb-2 group-hover:text-theme-primary transition-colors"
            >
              {card.label}
            </span>
            <span class="block text-sm text-theme-muted leading-relaxed">
              {card.summary}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</main>
