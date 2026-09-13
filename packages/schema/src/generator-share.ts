import { z } from "zod";

/** Limits for anonymous, text-only generator result sharing. */
export const GENERATOR_SHARE_LIMITS = {
  maxPayloadBytes: 64 * 1024,
  maxGeneratorIdLength: 80,
  maxTitleLength: 200,
  maxDescriptionLength: 280,
  maxContentLength: 64 * 1024,
  maxLabels: 8,
  maxLabelLength: 40,
  maxThemeLength: 80,
  maxPathLength: 200,
  maxImageUrlLength: 500,
} as const;

const safeGeneratorId = z
  .string()
  .trim()
  .min(1)
  .max(GENERATOR_SHARE_LIMITS.maxGeneratorIdLength)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

const safeRootRelativePath = z
  .string()
  .trim()
  .min(1)
  .max(GENERATOR_SHARE_LIMITS.maxPathLength)
  .regex(/^\/(?:generators|tools)\/[a-z0-9][a-z0-9-]*(?:\?.*)?$/);

const safeImageUrl = z
  .string()
  .url()
  .max(GENERATOR_SHARE_LIMITS.maxImageUrlLength)
  .refine((value) => value.startsWith("https://"), "Image URL must be HTTPS");

export const GeneratorShareMetadataSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(GENERATOR_SHARE_LIMITS.maxDescriptionLength)
      .optional(),
    theme: z
      .string()
      .trim()
      .max(GENERATOR_SHARE_LIMITS.maxThemeLength)
      .optional(),
    labels: z
      .array(
        z.string().trim().min(1).max(GENERATOR_SHARE_LIMITS.maxLabelLength),
      )
      .max(GENERATOR_SHARE_LIMITS.maxLabels)
      .optional(),
    generatorPath: safeRootRelativePath,
    imageUrl: safeImageUrl.optional(),
  })
  .strict();

export const GeneratorShareCreateSchema = z
  .object({
    generatorId: safeGeneratorId,
    title: z.string().trim().min(1).max(GENERATOR_SHARE_LIMITS.maxTitleLength),
    content: z.string().min(1).max(GENERATOR_SHARE_LIMITS.maxContentLength),
    metadata: GeneratorShareMetadataSchema,
  })
  .strict();

const shareId = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Share ID must be lowercase alphanumeric with hyphens",
  );

export const GeneratorShareSchema = z
  .object({
    shareId,
    generatorId: safeGeneratorId,
    title: z.string().trim().min(1).max(GENERATOR_SHARE_LIMITS.maxTitleLength),
    content: z.string().min(1).max(GENERATOR_SHARE_LIMITS.maxContentLength),
    metadata: GeneratorShareMetadataSchema,
    createdAt: z.string().datetime(),
  })
  .strict();

export type GeneratorShareCreate = z.infer<typeof GeneratorShareCreateSchema>;
export type GeneratorShare = z.infer<typeof GeneratorShareSchema>;
