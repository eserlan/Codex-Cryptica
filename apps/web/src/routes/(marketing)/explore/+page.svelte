<script lang="ts">
  import { onDestroy } from "svelte";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import {
    DISCORD_URL,
    GITHUB_URL,
    REDDIT_URL,
    PATREON_URL,
  } from "$lib/config";
  import {
    groupPublicLabelResults,
    type PublicContentKind,
  } from "$lib/content/labels/aggregate";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { HUB_SLUG_TO_THEME_ID } from "$lib/components/seo/generator-theme-maps";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // A label that is one of the site's genre/system hubs (cyberpunk, vampire,
  // western, …) gets that hub's actual visual theme rather than the neutral
  // default — the same mapping /generators/[hub] and /for/[slug] already use.
  const labelThemeId = $derived(
    data.label ? (HUB_SLUG_TO_THEME_ID[data.label] ?? null) : null,
  );
  const themeBootstrap = $derived.by(() => {
    if (!labelThemeId) return "";
    const serializedTheme = JSON.stringify(labelThemeId).replaceAll(
      "<",
      "\\u003C",
    );
    return (
      "<" +
      "script>window.__codexApplyTheme && window.__codexApplyTheme(" +
      serializedTheme +
      ");</" +
      "script>"
    );
  });

  // Always assign, never only when a theme exists: this component is reused
  // across /explore?label=a -> /explore?label=b navigations, so a themed
  // label's palette must not linger once the visitor picks another label.
  $effect(() => {
    themeStore.previewTheme(labelThemeId);
  });

  onDestroy(() => {
    themeStore.previewTheme(null);
  });

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "Explore Codex Cryptica";
  const DESCRIPTION =
    "Every section of Codex Cryptica in one place: worlds, examples, generators, tools, guides, and the campaign directory.";

  const KIND_LABEL: Record<PublicContentKind, string> = {
    answer: "Answers",
    for: "Campaign Guides",
    example: "Examples",
    generator: "Generators",
    world: "Public Worlds",
  };

  // A hand-picked label link is a genuine, indexable /explore destination.
  // A ?label= filter view is dynamic and thin by construction, so it stays
  // out of the crawl graph (mirrors /worlds's own dynamic/unindexed status).
  const isLabelView = $derived(Boolean(data.label));
  const groups = $derived(groupPublicLabelResults(data.results));

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
          href: REDDIT_URL,
          label: "Reddit",
          summary:
            "Follow devlogs and discuss Codex Cryptica with the community.",
          icon: "icon-[lucide--message-square]",
          external: true,
        },
        {
          href: GITHUB_URL,
          label: "GitHub",
          summary:
            "Codex Cryptica is open source. Read the code or file an issue.",
          icon: "icon-[lucide--github]",
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
          href: "/sitemap.xml",
          label: "Sitemap",
          summary: "The full machine-readable list of every public page.",
          icon: "icon-[lucide--list-tree]",
        },
        {
          href: "/llms.txt",
          label: "LLM Docs",
          summary:
            "A plain-text index of the site for AI assistants and crawlers.",
          icon: "icon-[lucide--file-code]",
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

<svelte:head>
  {#if themeBootstrap}
    <!-- Apply the label's theme before the body is parsed to avoid a first-paint flash. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html themeBootstrap}
  {/if}
</svelte:head>

<SeoHead
  title={isLabelView
    ? `#${data.label} on Codex Cryptica | Explore`
    : `${TITLE} | Codex Cryptica`}
  description={isLabelView
    ? `Public Codex Cryptica content tagged #${data.label}: worlds, answers, guides, examples, and generators.`
    : DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/explore")}
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="Explore Codex Cryptica's connected campaign-building tools"
  imageWidth={1600}
  imageHeight={1000}
  robots={isLabelView ? "noindex, follow" : undefined}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <div class="mb-12 max-w-2xl">
      {#if isLabelView}
        <a
          href="{cleanBase}/explore"
          class="mb-4 inline-flex items-center gap-2 py-1 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary"
        >
          <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          All of Explore
        </a>
        <h1
          class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
        >
          #{data.label}
        </h1>
        <p class="text-lg leading-relaxed text-theme-muted">
          Public Codex Cryptica content tagged <strong>#{data.label}</strong>.
        </p>
      {:else}
        <h1
          class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
        >
          {TITLE}
        </h1>
        <p class="text-lg leading-relaxed text-theme-muted">
          {DESCRIPTION}
        </p>
      {/if}
    </div>

    {#if isLabelView}
      {#if data.results.length === 0}
        <div
          class="mb-14 rounded border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/70"
        >
          Nothing is tagged <strong>#{data.label}</strong> yet. Try browsing
          <a
            href="{cleanBase}/explore"
            class="text-theme-primary hover:underline">all of Explore</a
          > instead.
        </div>
      {:else}
        {#each [...groups.entries()] as [kind, group] (kind)}
          <section class="mb-14">
            <div class="mb-6 border-b border-theme-border/60 pb-3">
              <h2
                class="font-header text-xl font-bold text-theme-text sm:text-2xl"
              >
                {KIND_LABEL[kind]}
              </h2>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              {#each group as result (result.href)}
                <a
                  href={result.href.startsWith("/")
                    ? `${cleanBase}${result.href}`
                    : result.href}
                  class="group flex flex-col gap-1 rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm transition-all hover:border-theme-primary/50 hover:shadow-md"
                >
                  <span
                    class="font-header text-sm font-bold text-theme-text group-hover:text-theme-primary"
                  >
                    {result.title}
                  </span>
                  <span class="text-sm text-theme-muted">{result.summary}</span>
                </a>
              {/each}
            </div>
          </section>
        {/each}
      {/if}
    {:else}
      {#each sections as section}
        <section class="mb-14">
          <div class="mb-6 border-b border-theme-border/60 pb-3">
            <h2
              class="font-header text-xl font-bold text-theme-text sm:text-2xl"
            >
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
    {/if}

    <div class="flex justify-center">
      <a
        href="https://groupfinder.gg/library/codex-cryptica"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
        aria-label="Codex Cryptica on Groupfinder"
      >
        <img
          src="https://groupfinder.gg/images/badges/gf-badge-light.svg"
          alt="Codex Cryptica on Groupfinder"
          width="164"
          height="45"
          loading="lazy"
          class="h-8 w-auto"
        />
      </a>
    </div>
  </div>
</div>
