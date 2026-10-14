import { z } from "zod";

export const UpstreamRulesSourceSchema = z.object({
  name: z.string().min(1),
  publisher: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.string().url(),
  attributionNotice: z.string().min(1),
});

export type UpstreamRulesSource = z.infer<typeof UpstreamRulesSourceSchema>;

export const RulesSourceManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  publisher: z.string().min(1),
  repositoryUrl: z.string().url(),
  websiteUrl: z.string().url(),
  version: z.string().min(1),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date"),
  license: z.enum(["CC-BY-4.0", "ORC", "OGL-1.0a", "custom"]),
  licenseName: z.string().min(1),
  licenseUrl: z.string().url(),
  attributionNotice: z.string().min(1),
  upstreamSources: z.array(UpstreamRulesSourceSchema).default([]),
  trademarkGuidance: z.string().min(1),
  contentBoundaries: z.string().min(1),
  aiUsageGuardrails: z.string().min(1),
});

export type RulesSourceManifest = z.infer<typeof RulesSourceManifestSchema>;
