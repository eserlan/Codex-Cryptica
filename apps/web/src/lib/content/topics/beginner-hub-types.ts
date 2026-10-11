export interface TopicLearningStepLink {
  title: string;
  href: string;
  description: string;
  badge?: string;
  isPrimary?: boolean;
}

export interface TopicPlayLoopStep {
  step: number;
  title: string;
  description: string;
}

export interface TopicLearningStep {
  step: number;
  id: string;
  heading: string;
  question: string;
  summary: string;
  takeaways: string[];
  links: TopicLearningStepLink[];
}

export interface TopicScopeItem {
  term: string;
  detail: string;
}

export interface TopicScopeColumn {
  title: string;
  subtitle: string;
  items: TopicScopeItem[];
}

export interface TopicBeginnerHubConfig {
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
  startHere: {
    heading: string;
    subheading: string;
    intro: string;
    playLoopSteps: TopicPlayLoopStep[];
    primaryLink: TopicLearningStepLink;
    reassuranceText: string;
  };
  learningSteps: TopicLearningStep[];
  scopeComparison: {
    heading: string;
    intro: string;
    learnNow: TopicScopeColumn;
    learnLater: TopicScopeColumn;
  };
  toolsAndNextSteps: {
    heading: string;
    intro: string;
    links: TopicLearningStepLink[];
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
