<script lang="ts">
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { DISCORD_URL, PATREON_URL } from "$lib/config";

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "Explore Codex Cryptica";
  const DESCRIPTION =
    "Every section of Codex Cryptica in one place: worlds, examples, generators, tools, guides, and the campaign directory.";

  type ExploreLink = {
    href: string;
    label: string;
    summary: string;
    icon: string;
    external?: boolean;
  };

  type ExploreSection = {
    title: string;
    description: string;
    links: ExploreLink[];
  };

  const sections: ExploreSection[] = [
    {
      title: "Build & Explore",
      description: "See the vault in action and generate content of your own.",
      links: [
        {
          href: "/worlds",
          label: "Explore Worlds",
          summary: "Browse public vaults other worldbuilders have shared.",
          icon: "icon-[lucide--globe]",
        },
        {
          href: "/examples",
          label: "Examples",
          summary:
            "Curated, unedited generator output you can read in full and take straight to the table.",
          icon: "icon-[lucide--file-text]",
        },
        {
          href: "/generators",
          label: "Generators",
          summary:
            "The reusable generator interface: NPCs, factions, quests, and more, theme by theme.",
          icon: "icon-[lucide--sparkles]",
        },
        {
          href: "/tools",
          label: "Tools",
          summary:
            "Every standalone generator and utility, grouped by what you're building.",
          icon: "icon-[lucide--wrench]",
        },
        {
          href: "/silhouettes",
          label: "Vector Silhouettes",
          summary:
            "Curated, theme-reactive vector RPG silhouettes and token art for characters, creatures, and locations.",
          icon: "icon-[lucide--shapes]",
        },
      ],
    },
    {
      title: "Find Your Setup",
      description:
        "Campaign- and genre-specific guides to running Codex Cryptica.",
      links: [
        {
          href: "/for",
          label: "Campaign Directory",
          summary:
            "Find the right setup for your system, genre, or campaign style.",
          icon: "icon-[lucide--compass]",
        },
      ],
    },
    {
      title: "Learn",
      description:
        "Guides, answers, and the reasoning behind how Codex Cryptica works.",
      links: [
        {
          href: "/answers",
          label: "Answers",
          summary:
            "Short, direct answers to common worldbuilding and vault questions.",
          icon: "icon-[lucide--circle-help]",
        },
        {
          href: "/blog",
          label: "Devlog",
          summary: "Release notes, design decisions, and what's shipping next.",
          icon: "icon-[lucide--newspaper]",
        },
        {
          href: "/responsible-ai-worldbuilding",
          label: "Responsible AI",
          summary:
            "How Codex Cryptica uses AI, and where it deliberately doesn't.",
          icon: "icon-[lucide--shield-check]",
        },
        {
          href: "/migrations",
          label: "Import & Migrate",
          summary:
            "Bring a campaign in from another tool without losing your notes.",
          icon: "icon-[lucide--import]",
        },
      ],
    },
    {
      title: "Community & Legal",
      description: "",
      links: [
        {
          href: DISCORD_URL,
          label: "Discord",
          summary: "Talk shop with other worldbuilders and get help fast.",
          icon: "icon-[lucide--message-circle]",
          external: true,
        },
        {
          href: PATREON_URL,
          label: "Support on Patreon",
          summary: "Back development directly and get supporter perks.",
          icon: "icon-[lucide--heart]",
          external: true,
        },
        {
          href: "/changelog",
          label: "Changelog",
          summary: "Every release, in order.",
          icon: "icon-[lucide--list-checks]",
        },
        {
          href: "/privacy",
          label: "Privacy Policy",
          summary: "",
          icon: "icon-[lucide--lock]",
        },
        {
          href: "/terms",
          label: "Terms of Service",
          summary: "",
          icon: "icon-[lucide--scroll-text]",
        },
      ].filter((link) => link.href),
    },
  ];
</script>

<SeoHead
  title="{TITLE} | Codex Cryptica"
  description={DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/explore")}
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="Explore Codex Cryptica's connected campaign-building tools"
  imageWidth={1600}
  imageHeight={1000}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <div class="mb-12 max-w-2xl">
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {TITLE}
      </h1>
      <p class="text-lg leading-relaxed text-theme-muted">
        {DESCRIPTION}
      </p>
    </div>

    {#each sections as section}
      <section class="mb-14">
        <div class="mb-6 border-b border-theme-border/60 pb-3">
          <h2 class="font-header text-xl font-bold text-theme-text sm:text-2xl">
            {section.title}
          </h2>
          {#if section.description}
            <p class="mt-1 font-light text-sm text-theme-muted">
              {section.description}
            </p>
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          {#each section.links as link}
            <a
              href={link.external ? link.href : `${cleanBase}${link.href}`}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              class="group flex items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm transition-all hover:border-theme-primary/50 hover:shadow-md"
            >
              <span
                class="{link.icon} mt-0.5 h-5 w-5 shrink-0 text-theme-primary"
              ></span>
              <span class="flex flex-col">
                <span
                  class="font-header text-sm font-bold text-theme-text group-hover:text-theme-primary"
                >
                  {link.label}
                </span>
                {#if link.summary}
                  <span class="mt-0.5 text-sm text-theme-muted">
                    {link.summary}
                  </span>
                {/if}
              </span>
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
