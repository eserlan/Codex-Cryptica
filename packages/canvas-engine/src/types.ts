import { z } from "zod";

export const CanvasNodeSchema = z.preprocess(
  (val: any) => {
    if (
      val &&
      typeof val === "object" &&
      !val.position &&
      typeof val.x === "number" &&
      typeof val.y === "number"
    ) {
      return {
        ...val,
        position: { x: val.x, y: val.y },
      };
    }
    return val;
  },
  z.object({
    id: z.string(),
    type: z.literal("entity"),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    entityId: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    color: z.string().optional(),
  }),
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
    .union([z.string(), z.record(z.union([z.string(), z.number()]))])
    .optional(),
});

export const CanvasSchema = z.object({
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
});

export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
