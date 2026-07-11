<script lang="ts">
  import { base } from "$app/paths";
  import { safeJsonLd } from "$lib/utils/json-ld";

  const origin = "https://codexcryptica.com";

  const generators = [
    {
      group: "Characters & NPCs",
      items: [
        {
          href: "/generators/dnd-npc",
          label: "D&D NPC Generator",
          summary:
            "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook.",
          icon: "icon-[lucide--user-round-plus]",
        },
        {
          href: "/generators/npc",
          label: "RPG NPC Generator",
          summary:
            "Generate NPCs across six genres — fantasy, cyberpunk, gothic, sci-fi, modern, and post-apocalyptic.",
          icon: "icon-[lucide--users]",
        },
      ],
    },
    {
      group: "Factions & Organizations",
      items: [
        {
          href: "/generators/faction",
          label: "Faction Generator",
          summary:
            "Build guilds, megacorps, vampire clans, and rebel cells with agendas, conflicts, and NPCs.",
          icon: "icon-[lucide--flag]",
        },
        {
          href: "/generators/vampire-clan",
          label: "Vampire Clan Generator",
          summary:
            "Create vampire clans, bloodlines, covens, and secret societies with dark agendas and plot hooks.",
          icon: "icon-[lucide--moon]",
        },
        {
          href: "/generators/nomad-clan",
          label: "Nomad Clan Generator",
          summary:
            "Build cyberpunk nomad convoys with territory routes, clan codes, corporate enemies, and road-ready hooks.",
          icon: "icon-[lucide--truck]",
        },
        {
          href: "/generators/names",
          label: "RPG Name Generator",
          summary:
            "Generate character, place, faction, and item names for any genre and cultural style.",
          icon: "icon-[lucide--pen-line]",
        },
        {
          href: "/generators/fantasy-names",
          label: "Fantasy Name Generator",
          summary:
            "Generate fantasy names across ten cultural styles — elven, dwarven, orcish, Norse, and more.",
          icon: "icon-[lucide--feather]",
        },
      ],
    },
    {
      group: "Divine & Mythology",
      items: [
        {
          href: "/generators/pantheon-generator",
          label: "Pantheon Generator",
          summary:
            "Build a small pantheon with alliances, rivalries, cosmic conflicts, and member deities.",
          icon: "icon-[lucide--sun]",
        },
        {
          href: "/generators/god-generator",
          label: "God & Deity Generator",
          summary:
            "Design a single deity, spirit, or abstract force with domains, taboos, symbols, and hooks.",
          icon: "icon-[lucide--star]",
        },
      ],
    },
    {
      group: "Adventure & Worldbuilding",
      items: [
        {
          href: "/generators/quest",
          label: "Quest Hook Generator",
          summary:
            "Create a GM-ready adventure seed with a complication, key NPC, twist, and reward.",
          icon: "icon-[lucide--scroll-text]",
        },
        {
          href: "/generators/settlement",
          label: "Settlement Generator",
          summary:
            "Draft towns and villages with economy, government, notable locations, and factions.",
          icon: "icon-[lucide--landmark]",
        },
        {
          href: "/generators/magic-item",
          label: "Magic Item Generator",
          summary:
            "Generate items with rarity, properties, history, and GM-facing lore.",
          icon: "icon-[lucide--sparkles]",
        },
        {
          href: "/generators/tavern",
          label: "Tavern Generator",
          summary:
            "Generate a fantasy tavern or inn with owner, patrons, rumours, and a hidden problem.",
          icon: "icon-[lucide--beer]",
        },
        {
          href: "/generators/social-hub",
          label: "Social Hub Generator",
          summary:
            "Generate a social venue for any genre — cyberpunk dive bars, western saloons, sci-fi cantinas.",
          icon: "icon-[lucide--map-pin]",
        },
        {
          href: "/generators/kingdom",
          label: "Kingdom Generator",
          summary:
            "Generate a fantasy kingdom with ruler, factions, geography, conflict level, and adventure hooks.",
          icon: "icon-[lucide--crown]",
        },
        {
          href: "/generators/nation",
          label: "Nation Generator",
          summary:
            "Generate a political entity for any genre — fantasy empires, cyberpunk megacorp-states, sci-fi federations.",
          icon: "icon-[lucide--globe]",
        },
        {
          href: "/generators/news-sheet-generator",
          label: "News Sheet Generator",
          summary:
            "Generate an in-world news sheet for any genre — cyberpunk screamsheets, fantasy broadsheets, station newsfeeds — with rumours, classifieds, propaganda, and GM-only hooks.",
          icon: "icon-[lucide--newspaper]",
        },
        {
          href: "/generators/language-generator",
          label: "Fictional Language Generator",
          summary:
            "Generate a conlang profile with pronunciation, naming rules, example names, and a starter glossary.",
          icon: "icon-[lucide--languages]",
        },
        {
          href: "/generators/random",
          label: "Surprise Me",
          summary:
            "Not sure what you need? Spin the idea machine — a random faction, realm, NPC, quest hook, deity, or venue.",
          icon: "icon-[lucide--dices]",
        },
      ],
    },
  ];

  const themeHubs = [
    {
      href: "/generators/fantasy",
      label: "Fantasy Hub",
      summary:
        "All fantasy generators in one place — NPCs, factions, kingdoms, magic items, pantheons, and more.",
      icon: "icon-[lucide--wand-sparkles]",
    },
    {
      href: "/generators/pirate",
      label: "Pirate Hub",
      summary:
        "Weathered charts, storm-dark harbours, free companies, and strange-sea adventures.",
      icon: "icon-[lucide--ship-wheel]",
    },
    {
      href: "/generators/cyberpunk",
      label: "Cyberpunk Hub",
      summary:
        "Megacorp fixers, neon-lit factions, street-level settlements, and chrome-edged quests.",
      icon: "icon-[lucide--cpu]",
    },
    {
      href: "/generators/sci-fi",
      label: "Sci-Fi Hub",
      summary:
        "Space opera NPCs, alien factions, frontier settlements, and interstellar quest hooks.",
      icon: "icon-[lucide--rocket]",
    },
    {
      href: "/generators/post-apocalyptic",
      label: "Post-Apocalyptic Hub",
      summary:
        "Survivor factions, wasteland settlements, scavenger NPCs, and brutal quest hooks.",
      icon: "icon-[lucide--radiation]",
    },
    {
      href: "/generators/modern",
      label: "Modern Hub",
      summary:
        "Conspiracy factions, urban settlements, modern-era NPCs, and investigation hooks.",
      icon: "icon-[lucide--building]",
    },
    {
      href: "/generators/vampire",
      label: "Vampire Hub",
      summary:
        "Vampire clans, gothic factions, undead NPCs, and dark quest hooks for horror campaigns.",
      icon: "icon-[lucide--moon]",
    },
    {
      href: "/generators/western",
      label: "Western Hub",
      summary:
        "Cowboys and outlaws, frontier towns, dusty saloons, and wild quest hooks.",
      icon: "icon-[game-icons--western-hat]",
    },
    {
      href: "/generators/steampunk",
      label: "Steampunk Hub",
      summary:
        "Guild conspiracies, airship factions, aetheric NPCs, and industrial quest hooks for steampunk campaigns.",
      icon: "icon-[lucide--cog]",
    },
    {
      href: "/generators/lancer",
      label: "Lancer Hub",
      summary:
        "Mech pilots, Union factions, frontier outpost settlements, and bleed-touched NPCs for Lancer campaigns.",
      icon: "icon-[lucide--hexagon]",
    },
    {
      href: "/generators/optimistic-exploration-sci-fi",
      label: "Optimistic Sci-Fi Hub",
      summary:
        "Diplomatic officers, scientific factions, space station hubs, and first-contact quest hooks for optimistic space opera campaigns.",
      icon: "icon-[lucide--rocket]",
    },
  ];

  const allItems = generators.flatMap((s) => s.items);

  const itemListJsonLd = safeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "RPG Generators",
    description:
      "Free RPG generators for tabletop GMs — NPCs, factions, kingdoms, taverns, quest hooks, magic items, and more.",
    url: `${origin}/generators`,
    numberOfItems: allItems.length,
    itemListElement: allItems.map((gen, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: gen.label,
      description: gen.summary,
      url: `${origin}${gen.href}`,
    })),
  });

  const breadcrumbJsonLd = safeJsonLd({
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
    ],
  });
</script>

<svelte:head>
  <title
    >RPG Generators | NPC, Faction, Kingdom, Tavern & More | Codex Cryptica</title
  >
  <meta
    name="description"
    content="Free RPG generators for tabletop GMs — create NPCs, factions, kingdoms, taverns, quest hooks, magic items, and more. Works without login. Import into your local campaign vault."
  />
  <link rel="canonical" href="https://codexcryptica.com/generators" />
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
        href="{base}/?ref=generators"
        class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors mb-8"
      >
        <span class="icon-[lucide--arrow-left] h-4 w-4"></span>
        Codex Cryptica
      </a>
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          Generator Hub
        </p>
        <h1
          class="font-header text-4xl md:text-5xl font-extrabold tracking-wide uppercase mb-5"
        >
          RPG Generators
        </h1>
        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          Free, table-ready generators for tabletop GMs. No login required —
          generate a draft, copy it, or save it into your local Codex Cryptica
          campaign vault.
        </p>
      </div>
    </div>
  </section>

  <div class="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-12">
    <section aria-labelledby="theme-hubs-heading">
      <h2
        id="theme-hubs-heading"
        class="font-header text-sm font-bold uppercase tracking-widest text-theme-text mb-4"
      >
        Browse by Theme
      </h2>
      <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each themeHubs as hub (hub.href)}
          <li>
            <a
              href="{base}{hub.href}"
              class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
            >
              <span class="{hub.icon} h-5 w-5 text-theme-primary mb-4 block"
              ></span>
              <span
                class="block font-header text-sm font-bold uppercase tracking-wider mb-2 group-hover:text-theme-primary transition-colors"
              >
                {hub.label}
              </span>
              <span class="block text-sm text-theme-muted leading-relaxed">
                {hub.summary}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </section>

    {#each generators as section (section.group)}
      <section aria-labelledby={`${section.group}-heading`}>
        <h2
          id={`${section.group}-heading`}
          class="font-header text-sm font-bold uppercase tracking-widest text-theme-text mb-4"
        >
          {section.group}
        </h2>
        <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {#each section.items as gen (gen.href)}
            <li>
              <a
                href="{base}{gen.href}"
                class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
              >
                <span class="{gen.icon} h-5 w-5 text-theme-primary mb-4 block"
                ></span>
                <span
                  class="block font-header text-sm font-bold uppercase tracking-wider mb-2 group-hover:text-theme-primary transition-colors"
                >
                  {gen.label}
                </span>
                <span class="block text-sm text-theme-muted leading-relaxed">
                  {gen.summary}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>
