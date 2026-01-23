import { z } from 'zod';

export const GraphNodeSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.string().optional(),
    data: z.record(z.any()).optional(),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }).optional(),
});

export const GraphEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
    data: z.record(z.any()).optional(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
