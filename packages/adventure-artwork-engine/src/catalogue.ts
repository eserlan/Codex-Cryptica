import { z } from "zod";
import { isArtworkCue } from "./cues";

const safeUrl = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://assets.codexcryptica.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.startsWith("/adventure-artwork/") &&
      /^\/adventure-artwork\/[a-zA-Z0-9_/-]+\.webp$/.test(url.pathname) &&
      !value.includes("%")
    );
  } catch {
    return false;
  }
});
const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const cue = identifier.max(64);
const variant = z
  .object({
    url: safeUrl,
    mime: z.literal("image/webp"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    bytes: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const text = z.string().trim().min(1);
const DISPLAY_LIMITS = {
  portrait: { width: 768, height: 1024, bytes: 256 * 1024 },
  landscape: { width: 1280, height: 720, bytes: 384 * 1024 },
} as const;

type VariantDimensions = z.infer<typeof variant>;

function validateAssetCues(
  asset: {
    primaryCues: readonly string[];
    settingCues: readonly string[];
    moodCues: readonly string[];
    timeCues: readonly string[];
    excludes: readonly string[];
  },
  ctx: z.RefinementCtx,
): void {
  const cues = [
    ...asset.primaryCues,
    ...asset.settingCues,
    ...asset.moodCues,
    ...asset.timeCues,
    ...asset.excludes,
  ];
  if (
    cues.length > 24 ||
    new Set(cues).size !== cues.length ||
    cues.some((value) => !isArtworkCue(value))
  ) {
    ctx.addIssue({ code: "custom", message: "Invalid cues" });
  }
}

function validateAssetGenres(
  asset: { genres: readonly string[] },
  ctx: z.RefinementCtx,
): void {
  if (new Set(asset.genres).size !== asset.genres.length) {
    ctx.addIssue({ code: "custom", message: "Duplicate genres" });
  }
}

function validatePreviewVariant(
  preview: VariantDimensions,
  ctx: z.RefinementCtx,
): void {
  if (
    Math.max(preview.width, preview.height) > 320 ||
    preview.bytes > 32 * 1024
  ) {
    ctx.addIssue({ code: "custom", message: "Preview exceeds budget" });
  }
}

function validateDisplayVariant(
  display: VariantDimensions,
  isPortrait: boolean,
  ctx: z.RefinementCtx,
): void {
  const limits = isPortrait
    ? DISPLAY_LIMITS.portrait
    : DISPLAY_LIMITS.landscape;
  if (
    display.width > limits.width ||
    display.height > limits.height ||
    display.bytes > limits.bytes
  ) {
    ctx.addIssue({ code: "custom", message: "Display exceeds budget" });
  }
}

const assetSchema = z
  .object({
    id: identifier.max(100),
    version: z.number().int().positive(),
    type: z.enum(["location", "npc", "scene", "atmosphere"]),
    genres: z
      .array(
        z.enum([
          "neutral",
          "fantasy",
          "contemporary",
          "science-fiction",
          "horror",
        ]),
      )
      .min(1),
    primaryCues: z.array(cue),
    settingCues: z.array(cue),
    moodCues: z.array(cue),
    timeCues: z.array(cue),
    excludes: z.array(cue),
    alt: text.max(240),
    variants: z.object({ preview: variant, display: variant }).strict(),
    crop: z
      .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
      .strict()
      .optional(),
    origin: z.literal("team-generated-ai"),
    provenance: z
      .object({
        tool: text,
        model: text,
        generatedAt: text,
        prompt: text,
        creator: text,
        distributionBasis: text,
        referencePermissions: text,
        attribution: text,
      })
      .strict(),
    review: z
      .object({
        status: z.literal("approved"),
        reviewer: text,
        date: text,
        notes: text,
      })
      .strict(),
    withdrawn: z.boolean().optional(),
  })
  .strict()
  .superRefine((asset, ctx) => {
    validateAssetCues(asset, ctx);
    validateAssetGenres(asset, ctx);
    validatePreviewVariant(asset.variants.preview, ctx);
    validateDisplayVariant(asset.variants.display, asset.type === "npc", ctx);
  });
export type ArtworkAsset = z.infer<typeof assetSchema>;
export function parseCatalogue(input: unknown): ArtworkAsset[] {
  if (new TextEncoder().encode(JSON.stringify(input)).length > 256 * 1024)
    throw new Error("Catalogue exceeds budget");
  const assets = z.array(assetSchema).max(200).parse(input);
  if (new Set(assets.map((asset) => asset.id)).size !== assets.length)
    throw new Error("Duplicate asset ID");
  return assets;
}
