import { z } from "zod";

export const ThemeTokensSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  border: z.string(),
  accent: z.string(),
  fontHeader: z.string(),
  fontBody: z.string(),
  texture: z.string().optional(),
});

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

export const GraphStyleConfigSchema = z.object({
  nodeShape: z.string(),
  edgeStyle: z.enum(["solid", "dashed", "dotted"]),
  nodeBorderWidth: z.number(),
  edgeColor: z.string(),
});

export type GraphStyleConfig = z.infer<typeof GraphStyleConfigSchema>;

export const StylingTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokens: ThemeTokensSchema,
  graph: GraphStyleConfigSchema,
});

export type StylingTemplate = z.infer<typeof StylingTemplateSchema>;

export const THEMES: Record<string, StylingTemplate> = {
  scifi: {
    id: "scifi",
    name: "Sci-Fi Terminal",
    tokens: {
      primary: "#4ade80",
      secondary: "#16a34a",
      background: "#050505",
      surface: "#0c0c0c",
      text: "#86efac",
      border: "rgba(22, 163, 74, 0.5)",
      accent: "#a855f7",
      fontHeader: "'Orbitron', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeColor: "#14532d",
    },
  },
  fantasy: {
    id: "fantasy",
    name: "Ancient Parchment",
    tokens: {
      primary: "#78350f",
      secondary: "#451a03",
      background: "#fdf6e3",
      surface: "#eee8d5",
      text: "#2d241e",
      border: "rgba(120, 53, 15, 0.3)",
      accent: "#991b1b",
      fontHeader: "'Cinzel', serif",
      fontBody: "'Spectral', serif",
      texture: "parchment.png",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeColor: "#78350f",
    },
  },
  modern: {
    id: "modern",
    name: "Clean Modern",
    tokens: {
      primary: "#2563eb",
      secondary: "#1d4ed8",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      border: "rgba(203, 213, 225, 1)",
      accent: "#4f46e5",
      fontHeader: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeColor: "#cbd5e1",
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neon Night",
    tokens: {
      primary: "#f472b6",
      secondary: "#db2777",
      background: "#020617",
      surface: "#0f172a",
      text: "#22d3ee",
      border: "rgba(244, 114, 182, 0.6)",
      accent: "#facc15",
      fontHeader: "'Fira Code', monospace",
      fontBody: "'Fira Code', monospace",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "dashed",
      nodeBorderWidth: 2,
      edgeColor: "#db2777",
    },
  },
  apocalyptic: {
    id: "apocalyptic",
    name: "Wasteland",
    tokens: {
      primary: "#f97316",
      secondary: "#ea580c",
      background: "#1c1917",
      surface: "#292524",
      text: "#ececec",
      border: "rgba(120, 113, 108, 0.5)",
      accent: "#f87171",
      fontHeader: "'Courier Prime', monospace",
      fontBody: "'Courier Prime', monospace",
      texture: "rust.png",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "dotted",
      nodeBorderWidth: 1,
      edgeColor: "#78716c",
    },
  },
};

export const DEFAULT_THEME = THEMES.scifi;
