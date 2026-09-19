export interface TopicImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface TopicGuideLink {
  title: string;
  href: string;
  description: string;
  focus: string;
}

export interface TopicExampleLink {
  title: string;
  href: string;
  genre: string;
  description: string;
  highlight: string;
  image?: TopicImage;
}

export interface TopicToolLink {
  title: string;
  href: string;
  description: string;
  badge?: string;
  image?: TopicImage;
}

export interface TopicWorkflowStep {
  step: number;
  title: string;
  description: string;
  recommendedResource: {
    title: string;
    href: string;
  };
}

/** Editorial copy for the fixed section frame every topic hub renders. */
export interface TopicHubCopy {
  thesisHeading: string;
  learnHeading: string;
  learnIntro: string;
  examplesHeading: string;
  examplesIntro: string;
  /** Lead-in for each example's takeaway line, e.g. "Why run it:". */
  exampleHighlightLabel: string;
  toolsHeading: string;
  toolsIntro: string;
  workflowHeading: string;
  workflowIntro: string;
  relatedHeading: string;
}

/** Wording for the hub's schema.org `about` and `ItemList` nodes. */
export interface TopicHubStructuredData {
  aboutName: string;
  aboutDescription: string;
  itemListName: string;
  itemListDescription: string;
  breadcrumbLabel: string;
}

export interface TopicHubThesisPoint {
  title: string;
  summary: string;
}

export interface TopicRelatedLink {
  title: string;
  href: string;
  description: string;
}

/**
 * Shape shared by every `/topics/<slug>` hub. Config objects use `satisfies`
 * against this so they keep their literal types while the shared
 * `TopicHubPage` and JSON-LD builders stay generic.
 */
export interface TopicHubConfig {
  slug: string;
  canonicalPath: string;
  /** Public cluster label shown as the hub's chip. */
  label: "heist" | "puzzle";
  title: string;
  metaTitle: string;
  description: string;
  leadParagraph: string;
  ogImage: string;
  ogImageAlt: string;
  heroImage?: TopicImage;
  copy: TopicHubCopy;
  structuredData: TopicHubStructuredData;
  thesisPoints: TopicHubThesisPoint[];
  coreGuides: TopicGuideLink[];
  workedExamples: TopicExampleLink[];
  generators: TopicToolLink[];
  workflow: TopicWorkflowStep[];
  relatedTopics: TopicRelatedLink[];
}
