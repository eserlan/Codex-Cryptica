import { z } from "zod";

export const CanvasNodeSchema = z.object({
  id: z.string(),
  type: z.literal("entity"),
  x: z.number(),
  y: z.number(),
  entityId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.string().optional(),
});

export const CanvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.string().optional().default("line"),
});

export const CanvasSchema = z.object({
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
});

export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
