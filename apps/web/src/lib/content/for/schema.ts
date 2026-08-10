import { z } from "zod";

export const LandingPageKindSchema = z.enum(["system", "genre", "use-case"]);
export type LandingPageKind = z.infer<typeof LandingPageKindSchema>;

export const LandingPageUseCaseSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});
export type LandingPageUseCase = z.infer<typeof LandingPageUseCaseSchema>;

export const LandingPageGraphStepSchema = z.object({
  label: z.string(),
  sublabel: z.string().optional(),
  type: z.string().optional(),
});
export type LandingPageGraphStep = z.infer<typeof LandingPageGraphStepSchema>;

export const LandingPageGraphSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(LandingPageGraphStepSchema),
});
export type LandingPageGraph = z.infer<typeof LandingPageGraphSchema>;

export const RecommendedToolSchema = z.object({
  title: z.string(),
  description: z.string(),
  href: z.string(),
  badge: z.string().optional(),
});
export type RecommendedTool = z.infer<typeof RecommendedToolSchema>;

export const LandingPageConfigSchema = z.object({
  slug: z.string(),
  kind: LandingPageKindSchema,
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string().optional(),
  }),
  hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    tagline: z.string(),
    problemStatement: z.string(),
  }),
  useCases: z.array(LandingPageUseCaseSchema),
  exampleGraph: LandingPageGraphSchema.optional(),
  recommendedTools: z.array(RecommendedToolSchema),
  cta: z.object({
    title: z.string(),
    description: z.string().optional(),
    buttonText: z.string(),
    buttonHref: z.string(),
  }),
  disclaimer: z.string().optional(),
});
export type LandingPageConfig = z.infer<typeof LandingPageConfigSchema>;
