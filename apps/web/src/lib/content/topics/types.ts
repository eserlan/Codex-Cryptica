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

/** A place in an example diagram, with the job it does. */
export interface TopicDiagramNode {
  id: string;
  name: string;
  role: string;
}

/** A route (travel) or flow (cargo) between two diagram nodes. */
export interface TopicDiagramLink {
  from: string;
  to: string;
  kind: "route" | "flow";
  label: string;
  detail: string;
  flashpoint?: true;
}

/** A relational schematic of an inline example, with no positions or scale. */
export interface TopicExampleDiagram {
  title: string;
  description: string;
  nodes: TopicDiagramNode[];
  links: TopicDiagramLink[];
}

/** A worked example written into the hub page itself, with no route of its own. */
export interface TopicInlineExample {
  title: string;
  genre: string;
  summary: string;
  parts: { term: string; text: string }[];
  highlight: string;
  diagram?: TopicExampleDiagram;
}

/** Editorial copy for the fixed section frame every topic hub renders. */
export interface TopicHubCopy {
  thesisHeading: string;
  /** Optional short definition shown between the thesis heading and its points. */
  thesisIntro?: string;
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
  label: "heist" | "puzzle" | "pirate" | "solo-rpg" | "sci-fi";
  title: string;
  metaTitle: string;
  description: string;
  leadParagraph: string;
  ogImage: string;
  ogImageAlt: string;
  heroImage?: TopicImage;
  /** The hub's one above-the-fold action, shown straight after the header. */
  primaryAction?: {
    label: string;
    href: string;
    secondary?: { label: string; href: string };
  };
  copy: TopicHubCopy;
  structuredData: TopicHubStructuredData;
  thesisPoints: TopicHubThesisPoint[];
  coreGuides: TopicGuideLink[];
  workedExamples: TopicExampleLink[];
  inlineExample?: TopicInlineExample;
  generators: TopicToolLink[];
  workflow: TopicWorkflowStep[];
  relatedTopics: TopicRelatedLink[];
}
