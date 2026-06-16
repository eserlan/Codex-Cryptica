<script lang="ts">
  import { base } from "$app/paths";

  type ToolLink = {
    href: string;
    label: string;
    summary: string;
    icon: string;
  };

  type ToolGroup = {
    title?: string;
    links: ToolLink[];
  };

  type ToolSection = {
    title: string;
    description: string;
    groups: ToolGroup[];
  };

  const toolSections: ToolSection[] = [
    {
      title: "RPG Generators",
      description:
        "Generate campaign-ready drafts, then copy them or save them into a local Codex Cryptica vault.",
      groups: [
        {
          title: "Characters & NPCs",
          links: [
            {
              href: "/tools/dnd-npc-generator",
              label: "D&D NPC Generator",
              summary:
                "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook.",
              icon: "icon-[lucide--user-round-plus]",
            },
            {
              href: "/tools/rpg-npc-generator",
              label: "RPG NPC Generator",
              summary:
                "Generate NPCs across six genres — fantasy, cyberpunk, gothic, sci-fi, modern, and post-apocalyptic.",
              icon: "icon-[lucide--users]",
            },
            {
              href: "/generators/npc",
              label: "Procedural NPC Generator",
              summary:
                "Genre-agnostic NPC generator — same six-theme engine via the reusable generator interface.",
              icon: "icon-[lucide--user-round-plus]",
            },
          ],
        },
        {
          title: "Factions & Organizations",
          links: [
            {
              href: "/tools/faction-generator",
              label: "Faction Generator",
              summary:
                "Create a fantasy faction with an agenda, internal conflict, rival group, notable NPCs, and adventure hook.",
              icon: "icon-[lucide--flag]",
            },
            {
              href: "/tools/vampire-clan-generator",
              label: "Vampire Clan Generator",
              summary:
                "Create vampire clans, bloodlines, covens, and secret societies with dark agendas and plot hooks.",
              icon: "icon-[lucide--moon]",
            },
            {
              href: "/tools/cyberpunk-megacorp-generator",
              label: "Cyberpunk Megacorp Generator",
              summary:
                "Create cyberpunk megacorps, syndicates, and fixer crews with hidden agendas, executives, and run hooks.",
              icon: "icon-[lucide--building-2]",
            },
            {
              href: "/tools/fantasy-guild-generator",
              label: "Fantasy Guild Generator",
              summary:
                "Create fantasy guilds, temple orders, and arcane circles with agendas, rivals, and adventure hooks.",
              icon: "icon-[lucide--shield]",
            },
            {
              href: "/tools/sci-fi-faction-generator",
              label: "Sci-Fi Faction Generator",
              summary:
                "Create galactic empires, rebel cells, and trade federations with agendas, rivals, and mission hooks.",
              icon: "icon-[lucide--rocket]",
            },
            {
              href: "/tools/wasteland-faction-generator",
              label: "Wasteland Faction Generator",
              summary:
                "Create post-apocalyptic raider gangs, settlements, and cults with agendas, rivals, and plot hooks.",
              icon: "icon-[lucide--radiation]",
            },
            {
              href: "/tools/fantasy-name-generator",
              label: "Fantasy Name Generator",
              summary:
                "Generate character, place, faction, and item names across ten cultural styles.",
              icon: "icon-[lucide--pen-line]",
            },
          ],
        },
        {
          title: "Divine & Mythology",
          links: [
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
          title: "Adventure & Worldbuilding",
          links: [
            {
              href: "/tools/quest-hook-generator",
              label: "Quest Hook Generator",
              summary:
                "Generate a GM-ready quest hook with a complication, key NPC, twist, and reward.",
              icon: "icon-[lucide--scroll-text]",
            },
            {
              href: "/generators/settlement",
              label: "Settlement Generator",
              summary:
                "Draft towns and villages with population, economy, government, locations, and factions.",
              icon: "icon-[lucide--landmark]",
            },
            {
              href: "/generators/magic-item",
              label: "Magic Item Generator",
              summary:
                "Generate item concepts with rarity, properties, history, and GM-facing lore.",
              icon: "icon-[lucide--sparkles]",
            },
            {
              href: "/generators/tavern",
              label: "Tavern Generator",
              summary:
                "Generate a fantasy tavern or inn with owner, patrons, rumours, hidden trouble, and adventure hooks.",
              icon: "icon-[lucide--beer]",
            },
            {
              href: "/generators/social-hub",
              label: "Social Hub Generator",
              summary:
                "Generate a social gathering venue for any genre — cyberpunk dive bars, western saloons, sci-fi cantinas, and more.",
              icon: "icon-[lucide--map-pin]",
            },
            {
              href: "/generators/kingdom",
              label: "Kingdom Generator",
              summary:
                "Generate a fantasy kingdom or empire with ruler, factions, geography, conflict level, and adventure hooks.",
              icon: "icon-[lucide--crown]",
            },
            {
              href: "/generators/nation",
              label: "Nation Generator",
              summary:
                "Generate a political entity for any genre — fantasy empires, cyberpunk megacorp-states, sci-fi federations, and more.",
              icon: "icon-[lucide--globe]",
            },
            {
              href: "/generators/random",
              label: "Surprise Me",
              summary:
                "Not sure what you need? Spin the idea machine — a random faction, realm, NPC, quest hook, or venue.",
              icon: "icon-[lucide--dices]",
            },
          ],
        },
      ],
    },
    {
      title: "Campaign Tools",
      description:
        "Core public pages for the local-first campaign manager, worldbuilding workspace, and AI-assisted GM workflows.",
      groups: [
        {
          links: [
            {
              href: "/free-rpg-campaign-manager",
              label: "Free RPG Campaign Manager",
              summary:
                "Explore the first SEO landing page and the main campaign-management pitch.",
              icon: "icon-[lucide--castle]",
            },
            {
              href: "/worldbuilding-tool",
              label: "Worldbuilding Tool",
              summary:
                "See how Codex Cryptica supports linked lore, timelines, canvases, and local-first vaults.",
              icon: "icon-[lucide--network]",
            },
            {
              href: "/ai-rpg-campaign-manager",
              label: "AI RPG Campaign Manager",
              summary:
                "Review the AI-assisted campaign workflow built around local notes and BYO Gemini access.",
              icon: "icon-[lucide--wand-sparkles]",
            },
            {
              href: "/responsible-ai-worldbuilding",
              label: "Responsible AI",
              summary:
                "Our guiding principles for ethical, optional, local-first AI assistance in worldbuilding.",
              icon: "icon-[lucide--shield-alert]",
            },
          ],
        },
      ],
    },
    {
      title: "Solutions",
      description:
        "Focused pages for searchers comparing campaign planning, worldbuilding, AI assistance, and privacy-first storage.",
      groups: [
        {
          links: [
            {
              href: "/solutions/campaign-manager",
              label: "Campaign Manager Solution",
              summary:
                "Campaign organization, graph navigation, maps, timelines, and prep workflows.",
              icon: "icon-[lucide--clipboard-list]",
            },
            {
              href: "/solutions/worldbuilding-tool",
              label: "Worldbuilding Solution",
              summary:
                "A visual wiki and campaign knowledge base for factions, places, characters, and lore.",
              icon: "icon-[lucide--book-open]",
            },
            {
              href: "/solutions/ai-gm-assistant",
              label: "AI GM Assistant Solution",
              summary:
                "AI-assisted lore drafting and revision workflows for game masters.",
              icon: "icon-[lucide--bot]",
            },
            {
              href: "/solutions/local-first-rpg",
              label: "Local-First RPG Solution",
              summary:
                "Privacy-first campaign storage using browser-local vaults and exportable data.",
              icon: "icon-[lucide--hard-drive]",
            },
          ],
        },
      ],
    },
    {
      title: "Comparisons",
      description:
        "Side-by-side alternatives for creators evaluating campaign and worldbuilding tools.",
      groups: [
        {
          links: [
            {
              href: "/vs/obsidian",
              label: "Codex Cryptica vs Obsidian",
              summary:
                "Compare a purpose-built RPG workspace with a general-purpose note app.",
              icon: "icon-[lucide--columns-3]",
            },
            {
              href: "/vs/world-anvil",
              label: "Codex Cryptica vs World Anvil",
              summary:
                "Compare local-first privacy with cloud-hosted worldbuilding and subscriptions.",
              icon: "icon-[lucide--scale]",
            },
            {
              href: "/vs/legendkeeper",
              label: "Codex Cryptica vs LegendKeeper",
              summary:
                "Compare offline-friendly browser storage with closed cloud wiki workflows.",
              icon: "icon-[lucide--git-compare]",
            },
            {
              href: "/vs/kanka-alternative",
              label: "Codex Cryptica vs Kanka",
              summary:
                "Compare private local-first vaults with cloud-hosted shared wikis and paywalls.",
              icon: "icon-[lucide--castle]",
            },
          ],
        },
      ],
    },
    {
      title: "Migration & Imports",
      description:
        "Client-side drag-and-drop parsers to preview and import campaign vaults from other services.",
      groups: [
        {
          links: [
            {
              href: "/import/obsidian-vault",
              label: "Obsidian Vault Importer",
              summary:
                "Seamlessly convert your Obsidian markdown campaign files into Codex Cryptica format.",
              icon: "icon-[lucide--folder-open]",
            },
            {
              href: "/import/world-anvil-export",
              label: "World Anvil JSON Importer",
              summary:
                "Extract articles, clean HTML formatting, and preview your campaign wiki offline from JSON backups.",
              icon: "icon-[lucide--file-json]",
            },
            {
              href: "/import/kanka-json",
              label: "Kanka JSON Importer",
              summary:
                "Convert Kanka campaign JSON exports into standard, local-first offline markdown files.",
              icon: "icon-[lucide--refresh-cw]",
            },
            {
              href: "/import/legendkeeper-json",
              label: "LegendKeeper JSON Importer",
              summary:
                "Extract LegendKeeper visual maps and slate blocks into clean, parent-child markdown folders.",
              icon: "icon-[lucide--folder-tree]",
            },
          ],
        },
      ],
    },
    {
      title: "Migration & Importer Hubs",
      description:
        "Migrate your campaign notes, wikis, and databases from other worldbuilding tools into local Codex Cryptica vaults.",
      groups: [
        {
          links: [
            {
              href: "/import/obsidian-vault",
              label: "Obsidian Vault Importer",
              summary:
                "Import your Obsidian campaign vault. Convert Markdown files, wiki-links, and YAML frontmatter into Codex.",
              icon: "icon-[lucide--folder-down]",
            },
            {
              href: "/import/world-anvil-export",
              label: "World Anvil Importer",
              summary:
                "Extract your campaign lore from World Anvil backup JSON exports and preview them offline.",
              icon: "icon-[lucide--download-cloud]",
            },
            {
              href: "/import/kanka-json",
              label: "Kanka Importer",
              summary:
                "Upload your Kanka campaign JSON export to import characters, locations, factions, and items.",
              icon: "icon-[lucide--download]",
            },
            {
              href: "/import/legendkeeper-json",
              label: "LegendKeeper Importer",
              summary:
                "Convert your LegendKeeper JSON project backups into offline campaign notes.",
              icon: "icon-[lucide--file-archive]",
            },
          ],
        },
      ],
    },
  ];
</script>

<svelte:head>
  <title>RPG Tools, Generators, and Comparisons | Codex Cryptica</title>
  <meta
    name="description"
    content="Browse Codex Cryptica's RPG generators, campaign tools, solution pages, and comparison guides from one central tools hub."
  />
  <link rel="canonical" href="https://codexcryptica.com/tools" />
  <link rel="help" href="{base}/llms.txt" />
</svelte:head>

<main
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
    <div class="max-w-6xl mx-auto">
      <a
        href="{base}/?ref=tools"
        class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-muted hover:text-theme-primary transition-colors mb-8"
      >
        <span class="icon-[lucide--arrow-left] h-4 w-4"></span>
        Codex Cryptica
      </a>
      <div class="max-w-3xl">
        <p
          class="text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4"
        >
          Tools Directory
        </p>
        <h1
          class="font-header text-4xl md:text-5xl font-extrabold tracking-wide uppercase mb-5"
        >
          RPG Tools, Generators, and Comparisons
        </h1>
        <p class="text-base md:text-lg text-theme-muted leading-relaxed">
          A central index for Codex Cryptica's public campaign tools,
          generators, solution pages, and comparison guides.
        </p>
      </div>
    </div>
  </section>

  <div class="max-w-6xl mx-auto px-6 py-12 md:py-16 space-y-14">
    {#each toolSections as section (section.title)}
      <section aria-labelledby={`${section.title}-heading`}>
        <div class="max-w-3xl mb-6">
          <h2
            id={`${section.title}-heading`}
            class="font-header text-2xl font-bold uppercase tracking-wider text-theme-primary mb-2"
          >
            {section.title}
          </h2>
          <p class="text-sm text-theme-muted leading-relaxed">
            {section.description}
          </p>
        </div>

        <div class="space-y-8">
          {#each section.groups as group, groupIndex (`${section.title}-${groupIndex}`)}
            <div>
              {#if group.title}
                <h3
                  class="font-header text-sm font-bold uppercase tracking-widest text-theme-text mb-4"
                >
                  {group.title}
                </h3>
              {/if}

              <ul class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {#each group.links as link (link.href)}
                  <li>
                    <a
                      href="{base}{link.href}"
                      class="group block h-full rounded-xl border border-theme-border/60 bg-theme-surface/35 p-5 hover:border-theme-primary/60 hover:bg-theme-surface/55 transition-colors"
                    >
                      <span
                        class="{link.icon} h-5 w-5 text-theme-primary mb-4 block"
                      ></span>
                      <span
                        class="block font-header text-sm font-bold uppercase tracking-wider mb-2 group-hover:text-theme-primary transition-colors"
                      >
                        {link.label}
                      </span>
                      <span
                        class="block text-sm text-theme-muted leading-relaxed"
                      >
                        {link.summary}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>
