import { z } from "zod";
import { BiomeConditionsSchema, StatementSchema } from "schema";

export {
  BiomeConditionsSchema,
  BiomeSourceSchema,
  RangeSchema,
  StatementSchema,
  BIOME_ALTERATION_ASPECTS,
  BIOME_OWN_TEXT_MAX,
  BIOME_REFERENCE_LINKS_MAX,
  STATEMENT_BASES,
  type BiomeAlteration,
  type BiomeAlterationAspect,
  type BiomeConditions,
  type BiomeOwnFields,
  type BiomeProfile,
  type BiomeReferenceLink,
  type BiomeReferenceSnapshot,
  type BiomeSource,
  type Range,
  type Statement,
} from "schema";

/** Where catalogue images are hosted (Cloudflare R2). Never committed. */
export const BIOME_IMAGE_HOST = "https://assets.codexcryptica.com";

export const IMAGE_LICENCES = [
  "CC0-1.0",
  "PD",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
] as const;

const imageUrl = z.string().refine((value) => {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      `${parsed.protocol}//${parsed.host}` === BIOME_IMAGE_HOST
    );
  } catch {
    return false;
  }
}, `Image URLs must be https URLs on ${BIOME_IMAGE_HOST}`);

const reviewSchema = z.object({
  reviewedBy: z.string().min(1),
  reviewedAt: z.string().min(1),
  notes: z.string().min(1),
});

/** An illustration made by the team ahead of time and reviewed by a person. */
export const GeneratedImageSchema = z.object({
  origin: z.literal("generated"),
  url: imageUrl,
  alt: z.string().min(1),
  kind: z.literal("illustration"),
  tool: z.string().min(1),
  generatedAt: z.string().min(1),
  prompt: z.string().min(1),
  review: reviewSchema.optional(),
});

/** A photograph (or drawing) used under a permissive licence. */
export const LicensedImageSchema = z.object({
  origin: z.literal("licensed"),
  url: imageUrl,
  alt: z.string().min(1),
  kind: z.enum(["photograph", "illustration"]),
  creator: z.string().min(1),
  sourceUrl: z.url({ protocol: /^https$/ }),
  licence: z.enum(IMAGE_LICENCES),
  licenceUrl: z.url({ protocol: /^https$/ }),
});

export const ImageRefSchema = z.discriminatedUnion("origin", [
  GeneratedImageSchema,
  LicensedImageSchema,
]);

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;
export type LicensedImage = z.infer<typeof LicensedImageSchema>;
export type ImageRef = z.infer<typeof ImageRefSchema>;

export const FILTER_FACETS = [
  "cold",
  "temperate",
  "hot",
  "dry",
  "wet",
  "forested",
  "open",
  "coastal",
  "high-elevation",
] as const;

export type FilterFacet = (typeof FILTER_FACETS)[number];

export const FILTER_FACET_LABELS: Readonly<Record<FilterFacet, string>> = {
  cold: "Cold",
  temperate: "Temperate",
  hot: "Hot",
  dry: "Dry",
  wet: "Wet",
  forested: "Forested",
  open: "Open ground",
  coastal: "Coastal",
  "high-elevation": "High elevation",
};

export const BIOME_CATEGORIES = ["climate-zone", "landform-habitat"] as const;

const kebabId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const ReferenceBiomeSchema = z.object({
  id: kebabId,
  name: z.string().min(1),
  category: z.enum(BIOME_CATEGORIES),
  summary: z.string().min(1).max(160),
  filters: z.array(z.enum(FILTER_FACETS)),
  conditions: BiomeConditionsSchema,
  landscape: z.array(StatementSchema),
  vegetation: z.array(StatementSchema),
  wildlife: z.array(StatementSchema),
  resources: z.array(StatementSchema),
  hazards: z.array(StatementSchema),
  variations: z.array(StatementSchema),
  images: z.array(ImageRefSchema).min(1),
  sourceIds: z.array(z.string()).min(1),
  related: z
    .array(z.object({ label: z.string().min(1), href: z.string().min(1) }))
    .optional(),
});

export type ReferenceBiome = z.infer<typeof ReferenceBiomeSchema>;
