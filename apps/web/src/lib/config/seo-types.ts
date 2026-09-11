export interface SEOPageData {
  slug: string;
  title: string;
  description: string;
  h1: string;
  subheading: string;
  introText: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  ctaText: string;
  keywords: string[];
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  /** Hero badge text. Defaults to "100% Local-First Campaign Wiki". */
  eyebrow?: string;
  /** Large emotional tagline rendered between h1 and subheading. Use \n to split lines. */
  tagline?: string;
  /** Optional second button in the hero. */
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  /** Links shown in a "Related pages" section above the FAQ. */
  relatedLinks?: Array<{ href: string; label: string }>;
  /** Show the Responsible AI trust banner before the FAQ section. */
  aiTrustSection?: boolean;
}

export interface SEOImportPageData extends SEOPageData {
  competitorName: string;
  /** Optional outbound link to the source tool, shown as a small credit line in the hero (e.g. a companion generator, not a competitor). */
  toolUrl?: string;
  toolLabel?: string;
}
