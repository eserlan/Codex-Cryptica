<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  const cleanBase = base === "/" ? "" : base;
  import { safeJsonLd } from "$lib/utils/json-ld";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { hubContext } from "$lib/stores/hub-context.svelte";
  import { getLandingPagesForHub } from "$lib/content/for/registry";
  import type { ThemeSlug } from "./+page";

  const { data } = $props();

  // System and genre guides that belong to this hub.
  const landingPages = $derived(getLandingPagesForHub(data.theme));

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

  const sharedCards = (
    settlementLabel: string,
    settlementSummary: string,
  ): GeneratorCard[] => [
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
      slug: "encounter",
      label: "Encounter Generator",
      summary:
        "Generate a playable combat, social, exploration, environmental, or mixed encounter with participants, environment, a complication, and outcomes.",
      icon: "icon-[lucide--swords]",
    },
    {
      slug: "puzzle",
      label: "Puzzle Generator",
      summary:
        "Create flexible encounter puzzles with layered clues, alternate solutions, and fail-forward consequences.",
      icon: "icon-[lucide--puzzle]",
    },
    {
      slug: "plot-twist-generator",
      label: "Plot Twist & Complication Generator",
      summary:
        "Turn an established situation into a coherent twist with fair foreshadowing, consequences, and new player choices.",
      icon: "icon-[lucide--shuffle]",
    },
    {
      slug: "bbeg-generator",
      label: "BBEG / Campaign Villain Generator",
      summary:
        "Create a campaign-scale antagonist with a concrete goal, methods, lieutenants, and an escalating plan the party can discover and disrupt.",
      icon: "icon-[lucide--skull]",
    },
    {
      slug: "council-vote",
      label: "Council Vote Generator",
      summary:
        "Generate a political vote quest — a named council of voters with distinct agendas that the party must sway before a deadline decision.",
      icon: "icon-[lucide--gavel]",
    },
    {
      slug: "secret-society",
      label: "Secret Society Generator",
      summary:
        "Create cults, sects, conspiracies, and hidden orders with doctrine, rituals, a public face, and adventure hooks.",
      icon: "icon-[lucide--eye]",
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
      label: settlementLabel,
      summary: settlementSummary,
      icon: "icon-[lucide--building-2]",
    },
    {
      slug: "dungeon-generator",
      label: "Dungeon & Delve Generator",
      summary:
        "Generate multi-layered dungeons, ancient ruins, subterranean vaults, alien complexes, or cybernetic facilities.",
      icon: "icon-[lucide--layers]",
    },
    {
      slug: "adventure-generator",
      label: "Adventure Idea Generator",
      summary:
        "Generate campaign-ready adventure concepts with initial situation, primary pressure, key locations, threats, and non-linear outcomes.",
      icon: "icon-[lucide--map]",
    },
    {
      slug: "minor-magic-item",
      label: "Minor Magic Item Generator",
      summary:
        "Generate small-scale charms, consumable potions, single-use devices, and curiosities with clear limits and quirks.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      slug: "creature",
      label: "Creature Generator",
      summary:
        "Generate monsters, beasts, alien fauna, and undead with ecology, signs, combat tactics, and adventure hooks.",
      icon: "icon-[lucide--paw-print]",
    },
    {
      slug: "artifact-generator",
      label: "Artifact & Relic Generator",
      summary:
        "Generate unique, named major artifacts and ancient relics with multi-tier powers, curses, pursuing factions, and destruction conditions.",
      icon: "icon-[lucide--gem]",
    },
  ];

  const surpriseMeCard: GeneratorCard = {
    slug: "random",
    label: "Surprise Me",
    summary:
      "Not sure what to generate? Spin the machine — a random idea tuned to your active theme.",
    icon: "icon-[lucide--dices]",
  };

  const nationCard: GeneratorCard = {
    slug: "nation",
    label: "Nation Generator",
    summary:
      "Build nations and power blocs with government, economy, military, and foreign relations.",
    icon: "icon-[lucide--globe]",
  };

  const shipCard: GeneratorCard = {
    slug: "ship-generator",
    label: "Ship Generator",
    summary:
      "Generate a campaign-ready vessel — freighter, warship, scout, derelict, or colony ship — with crew, complication, secret, and hooks.",
    icon: "icon-[lucide--rocket]",
  };

  const worldCard: GeneratorCard = {
    slug: "world",
    label: "Sci-Fi World Generator",
    summary:
      "Generate a planet, moon, or artificial world shaped by its environment, societies, conflicts, and adventure hooks.",
    icon: "icon-[lucide--earth]",
  };

  const starSystemCard: GeneratorCard = {
    slug: "star-system",
    label: "Star System Generator",
    summary:
      "Generate a coherent star system — star(s), major bodies, factions, resources, hazards, and a system-wide conflict or mystery.",
    icon: "icon-[lucide--orbit]",
  };

  const alienRaceCard: GeneratorCard = {
    slug: "alien-race",
    label: "Alien Race Generator",
    summary:
      "Generate a coherent alien species whose biology, homeworld, culture, and technology all follow from each other.",
    icon: "icon-[lucide--dna]",
  };

  const pirateShipCard: GeneratorCard = {
    slug: "ship-generator",
    label: "Pirate Ship Generator",
    summary:
      "Create a pirate vessel with a captain, crew culture, shipboard tension, prize-worthy complications, and secrets hidden below deck.",
    icon: "icon-[lucide--ship-wheel]",
  };

  // One generator, many mastheads: each hub links to the news sheet
  // generator under the name that genre actually uses for the format.
  const newsSheetCard = (label: string, summary: string): GeneratorCard => ({
    slug: "news-sheet-generator",
    label,
    summary,
    icon: "icon-[lucide--newspaper]",
  });

  const languageCard: GeneratorCard = {
    slug: "language-generator",
    label: "Language Generator",
    summary:
      "Design a fictional language profile — pronunciation, naming rules, example names, and a starter glossary tuned to your genre.",
    icon: "icon-[lucide--languages]",
  };

  const tavernCard: GeneratorCard = {
    slug: "tavern",
    label: "Tavern Generator",
    summary:
      "Generate a fantasy tavern or inn with owner, patrons, rumours, and a hidden problem.",
    icon: "icon-[lucide--beer]",
  };

  const socialHubCard: GeneratorCard = {
    slug: "social-hub",
    label: "Social Hub Generator",
    summary:
      "Generate a social venue for your genre — dive bars, cantinas, nightclubs, or underground markets.",
    icon: "icon-[lucide--map-pin]",
  };

  const vampireClanCard: GeneratorCard = {
    slug: "vampire-clan",
    label: "Vampire Clan Generator",
    summary:
      "Create vampire clans and bloodlines with hierarchy, feeding grounds, internal politics, and dark secrets.",
    icon: "icon-[lucide--moon]",
  };

  const nomadClanCard: GeneratorCard = {
    slug: "nomad-clan",
    label: "Nomad Clan Generator",
    summary:
      "Build cyberpunk nomad convoys with territory routes, clan codes, corporate enemies, and road-ready hooks.",
    icon: "icon-[lucide--truck]",
  };

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
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Draft villages, towns, and cities with guilds, power factions, notable locations, and hooks.",
        ),
        tavernCard,
        shipCard,
        nationCard,
        ...fantasyOnlyCards,
        newsSheetCard(
          "Broadsheet Generator",
          "Generate a town-crier broadsheet — headlines, guild notices, market rumours, and classifieds, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    pirate: {
      label: "Pirate",
      localStorageId: "pirate",
      eyebrow: "Charts, Storms & Free Companies",
      intro:
        "Build mature nautical adventures across charted waters, storm-dark harbours, privateer courts, and strange seas. Generate crews, factions, settlements, ships, and the rumours that travel fastest by lantern light.",
      metaTitle:
        "Pirate RPG Generators — Crews, Ships, Factions & More | Codex Cryptica",
      metaDescription:
        "Free pirate RPG generators for tabletop GMs. Create crews, ships, factions, settlements, quest hooks, and names for nautical campaigns. No login required.",
      cards: [
        ...sharedCards(
          "Port Generator",
          "Build harbours, island settlements, and hidden coves with factions, trade routes, notable locations, and hooks.",
        ),
        pirateShipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Broadside Generator",
          "Generate a shipboard broadside — harbour notices, prize claims, naval reports, and dockside rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
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
      cards: [
        ...sharedCards(
          "District Generator",
          "Build megacity districts with corps, gangs, fixers, black markets, and street-level tension.",
        ),
        nomadClanCard,
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Screamsheet Generator",
          "Generate a street screamsheet — corporate spin, gang violence, fixer rumours, and product ads, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
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
      cards: [
        ...sharedCards(
          "Colony Generator",
          "Build space stations, frontier colonies, and alien outposts with factions, resources, and threats.",
        ),
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Newsfeed Generator",
          "Generate a station newsfeed — pirate alerts, megacorp claims, distress notices, and trade rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
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
      cards: [
        ...sharedCards(
          "Enclave Generator",
          "Build survivor settlements with scarcity, faction rivalries, desperate NPCs, and brutal hooks.",
        ),
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Wasteland Bulletin Generator",
          "Generate a bunker bulletin — trade warnings, raider reports, ration notices, and salvage rumours, with GM-only hooks.",
        ),
        alienRaceCard,
        languageCard,
        surpriseMeCard,
      ],
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
      cards: [
        ...sharedCards(
          "Neighbourhood Generator",
          "Generate urban areas with power dynamics, local factions, points of interest, and hidden conflicts.",
        ),
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Tabloid Generator",
          "Generate a local tabloid — cover-ups, conspiracies, missing persons, and strange classifieds, with GM-only hooks.",
        ),
        alienRaceCard,
        languageCard,
        surpriseMeCard,
      ],
    },
    lancer: {
      label: "Lancer",
      localStorageId: "lancer",
      eyebrow: "Mechs, Pilots & the Long Rim",
      intro:
        "Bleed runs hot and the Long Rim doesn't wait. Build Union operatives, heterodox mech corps, frontier outpost factions, and NHP-adjacent NPCs for your Lancer campaign — every generator is tuned to the cockpit-terminal aesthetic and the weight of post-scarcity warfare.",
      metaTitle:
        "Lancer RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free Lancer RPG generators for tabletop GMs. Create mech pilots, Union factions, frontier outpost settlements, quest hooks, and names for your Lancer campaign. No login required.",
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Build frontier outposts, Union administrative hubs, and contested colony sites with mech bays, bleed zones, and factional tension.",
        ),
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Comms Digest Generator",
          "Generate an outpost comms digest — Union bulletins, contractor notices, pilot rumours, and frontier alerts, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    steampunk: {
      label: "Steampunk",
      localStorageId: "steampunk",
      eyebrow: "Brass, Aether & Empire",
      intro:
        "Gears grind, furnaces roar, and empires expand on the backs of the engine-workers. Build airship consortiums, guild conspiracies, aetheric laboratories, and desperate underclass rebels for your steampunk campaign — every generator is tuned to the smoke and brass of the industrial age.",
      metaTitle:
        "Steampunk RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free steampunk RPG generators for tabletop GMs. Create artificers, guild factions, airship settlements, quest hooks, and names for your steampunk campaign. No login required.",
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Build industrial boroughs, sky-dock towns, and smog-shrouded districts with guild factions, aetheric hazards, and working-class tension.",
        ),
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Penny Broadsheet Generator",
          "Generate a penny broadsheet — guild scandals, patent disputes, sky-dock notices, and agitator rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
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
      cards: [
        vampireClanCard,
        ...sharedCards(
          "Domain Generator",
          "Build vampire domains, gothic districts, and Elysiums with power brokers, hunting grounds, and dark secrets.",
        ),
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Occult Tabloid Generator",
          "Generate an occult tabloid — supernatural cover-ups, disappearances, ominous notices, and weird classifieds, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    "cosmic-horror": {
      label: "Cosmic Horror",
      localStorageId: "cosmic_horror",
      eyebrow: "The Unknown Beneath & Beyond",
      intro:
        "Build investigations shaped by impossible environments, forgotten expeditions, strange archaeology, and discoveries too large to explain away. These generators favour original eldritch mysteries, fragile certainty, and alien scale—not vampire courts or gothic-noir intrigue.",
      metaTitle:
        "Cosmic Horror RPG Generators — Investigators, Mysteries & More | Codex Cryptica",
      metaDescription:
        "Free cosmic-horror RPG generators for tabletop GMs. Create investigators, secret societies, remote outposts, impossible ruins, and unsettling adventure hooks. No login required.",
      cards: [
        ...sharedCards(
          "Outpost Generator",
          "Build remote stations, weather-beaten towns, and expedition camps with uneasy locals, evidence, and impossible surroundings.",
        ),
        socialHubCard,
        newsSheetCard(
          "Field Report Generator",
          "Generate a field report — missing expeditions, astronomical anomalies, restricted notices, and unsettling leads, with GM-only hooks.",
        ),
        alienRaceCard,
        languageCard,
        surpriseMeCard,
      ],
    },
    western: {
      label: "Western",
      localStorageId: "western",
      eyebrow: "Six-Guns, Trails & Dust",
      intro:
        "Dusty borderlands, rowdy saloons, and dangerous outlaws. Generate frontier settlements, bounty quests, gunslinger NPCs, and rail-baron factions for your Western campaign — all pre-tuned to the genre.",
      metaTitle:
        "Western RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free Western RPG generators for tabletop GMs. Create gunslinger NPCs, outlaws, saloons, settlements, quest hooks, and names for your frontier campaign. No login required.",
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Build frontier outposts and ghost towns with sheriff departments, outlaw camps, and gold claims.",
        ),
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Frontier Newspaper Generator",
          "Generate a frontier weekly — telegraph dispatches, outlaw sightings, wanted notices, and saloon rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    "space-opera-resistance": {
      label: "Space Opera Resistance",
      localStorageId: "space-opera-resistance",
      eyebrow: "Rebellion & Imperial Might",
      intro:
        "Fight the empire or maintain order in the galaxy. Generate hidden rebel bases, imperial capital cities, oppressive factions, and thrilling space opera quests for your campaign.",
      metaTitle:
        "Space Opera Resistance RPG Generators — Faction, Settlement, Quest & More | Codex Cryptica",
      metaDescription:
        "Free Space Opera Resistance RPG generators for tabletop GMs. Create rebel bases, imperial capitals, smuggling factions, and quest hooks. No login required.",
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Build hidden rebel bases, imperial capital cities, and smuggling spaceports with factions, points of interest, and rising tension.",
        ),
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Underground Broadcast Generator",
          "Generate a resistance broadcast — imperial propaganda, smuggler notices, sector alerts, and rebel rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    "optimistic-exploration-sci-fi": {
      label: "Optimistic Sci-Fi",
      localStorageId: "startrek",
      eyebrow: "Diplomacy, Discovery & the Stars",
      intro:
        "Draft diplomatic starships, scientific missions, federated worlds, first-contact stories, academy-trained officers, and conflicts where ideals are tested rather than discarded.",
      metaTitle:
        "Optimistic Sci-Fi RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
      metaDescription:
        "Free optimistic sci-fi RPG generators for tabletop GMs. Create diplomatic officers, scientific factions, space station hubs, quest hooks, and names for your campaign. No login required.",
      cards: [
        ...sharedCards(
          "Settlement Generator",
          "Build research outposts, orbital stations, and core world cities with science directors, fleet admirals, and planetary governors.",
        ),
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Station Newsfeed Generator",
          "Generate a station promenade daily — survey reports, diplomatic notices, academy news, and dockside rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
    },
    "space-western": {
      label: "Space Western",
      localStorageId: "space-western",
      eyebrow: "Frontier Scoundrels & Asteroid Rigs",
      intro:
        "Battered freighters, lawless asteroid boomtowns, mining syndicates, and high-stakes smuggling runs. Generate frontier settlements, scoundrel NPCs, rust-bucket starships, and bounty contracts for your space western campaign — all free and pre-tuned.",
      metaTitle:
        "Space Western RPG Generators — NPC, Ship, Faction & More | Codex Cryptica",
      metaDescription:
        "Free Space Western and Scoundrel RPG generators for tabletop GMs. Create scoundrel NPCs, smuggling factions, asteroid boomtowns, rust-bucket freighters, and bounty quests. No login required.",
      cards: [
        ...sharedCards(
          "Frontier Outpost Generator",
          "Build asteroid claims, dusty planetary depots, and hollow-rock cantinas with mining councils, marshals, and corporate enforcers.",
        ),
        starSystemCard,
        alienRaceCard,
        worldCard,
        shipCard,
        socialHubCard,
        nationCard,
        newsSheetCard(
          "Rim-World Gazette Generator",
          "Generate a frontier news bulletin — bounty warrants, mining claim disputes, customs warnings, and cantina rumours, with GM-only hooks.",
        ),
        languageCard,
        surpriseMeCard,
      ],
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
  <link rel="help" href="{cleanBase}/llms.txt" />
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

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between gap-4 mb-8">
        <a
          href="{cleanBase}/generators"
          class="inline-flex items-center gap-2 text-xs font-bold text-theme-muted hover:text-theme-primary transition-colors"
        >
          <span class="icon-[lucide--arrow-left] h-4 w-4"></span>
          All Generators
        </a>

        <div
          class="flex items-center gap-1 rounded-lg border border-theme-border/60 bg-theme-surface/50 p-1 shadow-sm"
          role="group"
          aria-label="App Appearance"
        >
          <button
            type="button"
            title="Switch to Light Mode"
            aria-label="Light mode"
            aria-pressed={themeStore.resolvedAppAppearanceId ===
              "neutral-light"}
            class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all {themeStore.resolvedAppAppearanceId ===
            'neutral-light'
              ? 'bg-theme-primary text-theme-bg shadow-sm'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => themeStore.setAppAppearance("neutral-light")}
          >
            <span class="icon-[lucide--sun] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span class="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            title="Switch to Dark Mode"
            aria-label="Dark mode"
            aria-pressed={themeStore.resolvedAppAppearanceId === "neutral-dark"}
            class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-all {themeStore.resolvedAppAppearanceId ===
            'neutral-dark'
              ? 'bg-theme-primary text-theme-bg shadow-sm'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => themeStore.setAppAppearance("neutral-dark")}
          >
            <span class="icon-[lucide--moon] h-3.5 w-3.5" aria-hidden="true"
            ></span>
            <span class="hidden sm:inline">Dark</span>
          </button>
        </div>
      </div>
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          {config.eyebrow}
        </p>
        <h1
          class="font-header text-4xl md:text-5xl font-extrabold tracking-wide mb-5"
        >
          {config.label} RPG Generators
        </h1>
        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          {config.intro}
        </p>
      </div>
    </div>
  </section>

  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
    <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each config.cards as card (card.slug)}
        <li>
          <a
            href="{cleanBase}/generators/{card.slug === 'random'
              ? card.slug
              : `${data.theme}/${card.slug}`}"
            onclick={() => {
              themeStore.setTheme(config.localStorageId);
              hubContext.set(data.theme);
            }}
            class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
          >
            <span class="{card.icon} h-5 w-5 text-theme-primary mb-4 block"
            ></span>
            <span
              class="block font-header text-sm font-bold mb-2 group-hover:text-theme-primary transition-colors"
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

    {#if landingPages.length > 0}
      <section class="mt-14 border-t border-theme-border/60 pt-10">
        <h2 class="font-header text-xl font-bold mb-2">
          Campaign guides for these worlds
        </h2>
        <p class="text-sm text-theme-muted leading-relaxed mb-6">
          How Codex Cryptica handles the systems and genres these generators are
          built for.
        </p>
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each landingPages as page (page.slug)}
            <li>
              <a
                href="{cleanBase}/for/{page.slug}"
                class="group flex h-full items-start justify-between gap-4 rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
              >
                <span>
                  <span
                    class="block font-header text-sm font-bold mb-2 group-hover:text-theme-primary transition-colors"
                  >
                    {page.hero.title}
                  </span>
                  <span class="block text-sm text-theme-muted leading-relaxed">
                    {page.hero.tagline}
                  </span>
                </span>
                <span
                  class="icon-[lucide--arrow-right] h-4 w-4 shrink-0 mt-0.5 text-theme-primary transition-transform group-hover:translate-x-1"
                ></span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>
