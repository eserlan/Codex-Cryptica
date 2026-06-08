export interface RASeriesArticle {
  slug: string;
  title: string;
}

export const RA_SERIES: RASeriesArticle[] = [
  {
    slug: "lore-oracle-not-the-author",
    title: "The Lore Oracle Is Not the Author",
  },
  {
    slug: "worldbuilding-tool-without-ai",
    title: "A Worldbuilding Tool Should Still Work Without AI",
  },
  {
    slug: "worldbuilding-ai-needs-your-lore",
    title: "Why Worldbuilding AI Should Know Your Lore Before It Speaks",
  },
  { slug: "drafts-are-not-canon", title: "Drafts Are Not Canon" },
  {
    slug: "ai-campaign-prep-without-losing-your-voice",
    title: "Six Ways to Use AI in Campaign Prep Without Losing Your Voice",
  },
  {
    slug: "ai-slop-is-context-failure",
    title: "AI Slop Happens When the Tool Has No Memory",
  },
  {
    slug: "revising-your-lore-with-the-oracle",
    title: "Revising Your Lore with the Oracle",
  },
];

export const RA_SERIES_SLUGS = new Set(RA_SERIES.map((a) => a.slug));
