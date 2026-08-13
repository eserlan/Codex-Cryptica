import { z } from "zod";

export const CanvasFileSchema = z.object({
  path: z.string().startsWith("files/"),
  name: z.string().min(1),
  mimeType: z.string(),
  size: z.number().int().positive(),
});

export const CanvasDrawingPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const CanvasDrawingSchema = z.object({
  id: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().finite().positive().max(64),
  points: z.array(CanvasDrawingPointSchema).min(1),
});

export type CanvasDrawingPoint = z.infer<typeof CanvasDrawingPointSchema>;
export type CanvasDrawing = z.infer<typeof CanvasDrawingSchema>;

export const DEFAULT_CANVAS_DRAWING_COLOR = "#f97316";
export const DEFAULT_CANVAS_DRAWING_WIDTH = 4;
export const CANVAS_DRAWING_WIDTH_PRESETS = [2, 4, 8, 14] as const;

export function normalizeCanvasDrawingColor(
  value: string,
  fallback = DEFAULT_CANVAS_DRAWING_COLOR,
) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

export function normalizeCanvasDrawingWidth(
  value: number,
  fallback = DEFAULT_CANVAS_DRAWING_WIDTH,
) {
  return Number.isFinite(value) && value > 0 && value <= 64 ? value : fallback;
}

// Semantic keys, not raw colors: the app resolves each to a themed CSS value
// (see canvasTextBackgroundStyle in canvas-workspace-helpers.ts) so a note's
// background stays in step with whichever theme the vault has active,
// instead of a hardcoded palette that could clash with e.g. horror/cyberpunk.
export const DEFAULT_CANVAS_TEXT_BACKGROUND = "default";
export const CANVAS_TEXT_BACKGROUND_PRESETS = [
  "default",
  "primary",
  "accent",
  "secondary",
  "warning",
  "transparent",
] as const;
export type CanvasTextBackground =
  (typeof CANVAS_TEXT_BACKGROUND_PRESETS)[number];

export function normalizeCanvasTextBackground(
  value: string,
  fallback: CanvasTextBackground = DEFAULT_CANVAS_TEXT_BACKGROUND,
): CanvasTextBackground {
  return (CANVAS_TEXT_BACKGROUND_PRESETS as readonly string[]).includes(value)
    ? (value as CanvasTextBackground)
    : fallback;
}

export const DEFAULT_CANVAS_TEXT_FONT_SIZE = 14;
export const CANVAS_TEXT_FONT_SIZE_PRESETS = [12, 14, 18, 24, 32] as const;

export function normalizeCanvasTextFontSize(
  value: number,
  fallback = DEFAULT_CANVAS_TEXT_FONT_SIZE,
) {
  return Number.isFinite(value) && value >= 8 && value <= 96 ? value : fallback;
}

export function appendCanvasDrawingPoint(
  drawing: CanvasDrawing,
  point: CanvasDrawingPoint,
  minimumDistance = 0.5,
): CanvasDrawing {
  if (!CanvasDrawingPointSchema.safeParse(point).success) return drawing;

  const previous = drawing.points[drawing.points.length - 1];
  if (
    previous &&
    Math.hypot(point.x - previous.x, point.y - previous.y) < minimumDistance
  ) {
    return drawing;
  }

  return { ...drawing, points: [...drawing.points, point] };
}

const CanvasNodeBaseSchema = z.object({
  id: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
  extent: z.string().optional(),
  style: z.unknown().optional(),
});

export const CanvasNodeSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== "object") return val;

    const normalized =
      !val.position && typeof val.x === "number" && typeof val.y === "number"
        ? { ...val, position: { x: val.x, y: val.y } }
        : val;

    if (
      normalized.data === undefined &&
      [
        "delveRoom",
        "delveSectorGroup",
        "group",
        "situation",
        "location",
        "npc",
        "clue",
        "threat",
        "outcome",
      ].includes(normalized.type)
    ) {
      const {
        type: _type,
        position: _position,
        x: _x,
        y: _y,
        width: _width,
        height: _height,
        color: _color,
        parentId: _parentId,
        extent: _extent,
        style: _style,
        ...legacyData
      } = normalized;
      return {
        ...normalized,
        // Early public-generator builds stored the domain payload directly on
        // the node. Preserve it under `data` so those canvases remain usable.
        data: legacyData,
      };
    }

    return normalized;
  },
  z.discriminatedUnion("type", [
    CanvasNodeBaseSchema.extend({
      type: z.literal("entity"),
      entityId: z.string(),
      data: z.unknown().optional(),
    }),
    CanvasNodeBaseSchema.extend({
      type: z.literal("file"),
      file: CanvasFileSchema,
      data: z.unknown().optional(),
    }),
    CanvasNodeBaseSchema.extend({
      type: z.enum([
        "delveRoom",
        "delveSectorGroup",
        "group",
        "situation",
        "location",
        "npc",
        "clue",
        "threat",
        "outcome",
        "text",
      ]),
      entityId: z.string().optional(),
      data: z.unknown(),
    }),
  ]),
);

export const CanvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  type: z.string().optional().default("smoothstep"),
  style: z
    .union([
      z.string(),
      z.record(z.string(), z.union([z.string(), z.number()])),
    ])
    .optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  animated: z.boolean().optional(),
});

export const CanvasSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  drawings: z.array(CanvasDrawingSchema).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  lastModified: z.number().optional(),
  playerVisible: z.boolean().optional(),
});

export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasFile = z.infer<typeof CanvasFileSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
