import type { TopicImage } from "./types";

export interface TopicJobLink {
  title: string;
  href: string;
  description: string;
  /** Short chip text, e.g. "Answer" or "Generator". */
  badge: string;
}

/** One DM job ("Prep the next session") and the existing pages that solve it. */
export interface TopicJobSection {
  id: string;
  heading: string;
  /** The question the DM is asking, written in their voice. */
  question: string;
  intro: string;
  links: TopicJobLink[];
}

export interface TopicFunnelStep {
  title: string;
  description: string;
}

/**
 * Shape of a task-first hub (`/topics/dnd`): organised around the jobs a
 * game master is trying to get done, not around product features.
 */
export interface TopicJobHubConfig {
  slug: string;
  canonicalPath: string;
  /** Public cluster label shown as the hub's chip. */
  label: string;
  title: string;
  metaTitle: string;
  description: string;
  leadParagraph: string;
  ogImage: string;
  ogImageAlt: string;
  heroImage?: TopicImage;
  /** The one conversion the page leads with. */
  primaryCta: {
    heading: string;
    body: string;
    action: { label: string; href: string };
    supportingLinks: TopicJobLink[];
  };
  jobs: TopicJobSection[];
  funnel: {
    heading: string;
    intro: string;
    steps: TopicFunnelStep[];
  };
  relatedHeading: string;
  relatedTopics: { title: string; href: string; description: string }[];
  structuredData: {
    aboutName: string;
    aboutDescription: string;
    itemListName: string;
    itemListDescription: string;
    breadcrumbLabel: string;
  };
}
