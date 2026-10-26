<script lang="ts">
  import { resolve } from "$app/paths";
  import { safeJsonLd } from "#lib/utils/json-ld.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";
  import {
    generatorPath,
    groupGeneratorCatalogue,
  } from "#lib/content/generator-catalogue.js";

  const cleanBase = resolve("") === "/" ? "" : resolve("");

  const origin = "https://codexcryptica.com";

  const generators = groupGeneratorCatalogue().map((group) => ({
    ...group,
    items: group.items.map((entry) => ({
      href: generatorPath(entry.slug),
      label: entry.label,
      summary: entry.summary,
      icon: entry.icon,
    })),
  }));

  const surpriseMe = {
    href: "/generators/random",
    label: "Surprise Me",
    summary:
      "Not sure what you need? Spin the idea machine: a random faction, realm, NPC, quest hook, deity, or venue.",
    icon: "icon-[lucide--dices]",
  };

  const themeHubs = [
    {
      href: "/generators/fantasy",
      label: "Fantasy Hub",
      summary:
        "All fantasy generators in one place: NPCs, factions, kingdoms, magic items, pantheons, and more.",
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
      href: "/generators/cosmic-horror",
      label: "Cosmic Horror Hub",
      summary:
        "Impossible mysteries, remote outposts, unsettling investigators, and eldritch adventure hooks.",
      icon: "icon-[lucide--brain]",
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
      href: "/generators/space-opera-resistance",
      label: "Space Opera Resistance Hub",
      summary:
        "Rebel cells, imperial factions, hidden bases, and desperate missions for galactic resistance campaigns.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      href: "/generators/optimistic-exploration-sci-fi",
      label: "Optimistic Sci-Fi Hub",
      summary:
        "Diplomatic officers, scientific factions, space station hubs, and first-contact quest hooks for optimistic space opera campaigns.",
      icon: "icon-[lucide--rocket]",
    },
    {
      href: "/generators/space-western",
      label: "Space Western Hub",
      summary:
        "Frontier scoundrels, asteroid boomtowns, smuggling rings, and rust-bucket freighters for space western campaigns.",
      icon: "icon-[lucide--orbit]",
    },
    {
      href: "/generators/superhero",
      label: "Superhero Hub",
      summary:
        "Four-colour heroics, villain schemes, crossover events, and metahuman factions for comic book campaigns.",
      icon: "icon-[lucide--zap]",
    },
  ];

  const allItems = [...generators.flatMap((s) => s.items), surpriseMe];

  const itemListJsonLd = safeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "RPG Generators",
    description:
      "Free RPG generators for tabletop GMs: NPCs, factions, kingdoms, taverns, quest hooks, magic items, and more.",
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

<SeoHead
  title="RPG Generators | NPC, Faction, Kingdom, Tavern & More | Codex Cryptica"
  description="Free RPG generators for tabletop GMs: create NPCs, factions, kingdoms, taverns, quest hooks, magic items, and more. Works without login. Import into your local campaign vault."
  canonicalUrl="https://codexcryptica.com/generators"
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="Codex Cryptica RPG generator tools overview"
  keywords={[
    "rpg generators",
    "tabletop generators",
    "npc generator",
    "faction generator",
    "dungeon generator",
    "quest hook generator",
  ]}
  jsonLd={[itemListJsonLd, breadcrumbJsonLd]}
/>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
    <div class="max-w-6xl mx-auto">
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          Generator Hub
        </p>
        <h1
          class="font-display text-4xl md:text-5xl font-extrabold tracking-wide mb-5"
        >
          RPG Generators
        </h1>

        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          Free, table-ready generators for tabletop GMs. No login required:
          generate a draft, copy it, or save it into your local Codex Cryptica
          campaign vault.
        </p>
      </div>
    </div>
  </section>

  {#snippet card(item: {
    href: string;
    label: string;
    summary: string;
    icon: string;
  })}
    <a
      href="{cleanBase}{item.href}"
      class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
    >
      <span class="{item.icon} h-5 w-5 text-theme-primary mb-4 block"></span>

      <span
        class="block font-header text-base font-bold text-theme-text mb-2 group-hover:text-theme-primary transition-colors"
      >
        {item.label}
      </span>
      <span class="block text-sm text-theme-muted leading-relaxed">
        {item.summary}
      </span>
    </a>
  {/snippet}

  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-12">
    <nav aria-label="Generator categories">
      <ul class="flex flex-wrap gap-2">
        {#each generators as section (section.id)}
          <li>
            <a
              href="#{section.id}"
              class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/35 px-3 py-1.5 text-sm text-theme-text hover:border-theme-primary/60 hover:text-theme-primary transition-colors"
            >
              {section.label}
              <span class="text-xs text-theme-muted"
                >{section.items.length}</span
              >
            </a>
          </li>
        {/each}
        <li>
          <a
            href="#theme-hubs"
            class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/35 px-3 py-1.5 text-sm text-theme-text hover:border-theme-primary/60 hover:text-theme-primary transition-colors"
          >
            Browse by theme
          </a>
        </li>
      </ul>
    </nav>

    {#each generators as section (section.id)}
      <section
        id={section.id}
        aria-labelledby={`${section.id}-heading`}
        class="scroll-mt-24"
      >
        <h2
          id={`${section.id}-heading`}
          class="font-header text-xl font-bold text-theme-text mb-1"
        >
          {section.label}
        </h2>
        <p class="text-sm text-theme-muted mb-4">{section.description}</p>
        <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {#each section.items as gen (gen.href)}
            <li>{@render card(gen)}</li>
          {/each}
        </ul>
      </section>
    {/each}

    <section aria-labelledby="surprise-heading">
      <h2
        id="surprise-heading"
        class="font-header text-xl font-bold text-theme-text mb-4"
      >
        Not Sure Where to Start?
      </h2>
      <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <li>{@render card(surpriseMe)}</li>
      </ul>
    </section>

    <section
      id="theme-hubs"
      aria-labelledby="theme-hubs-heading"
      class="scroll-mt-24"
    >
      <h2
        id="theme-hubs-heading"
        class="font-header text-xl font-bold text-theme-text mb-4"
      >
        Browse by Theme
      </h2>

      <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each themeHubs as hub (hub.href)}
          <li>{@render card(hub)}</li>
        {/each}
      </ul>
    </section>
  </div>
</div>
