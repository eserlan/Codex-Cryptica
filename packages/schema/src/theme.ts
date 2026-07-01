import { z } from "zod";
import { type JargonMap } from "./jargon";

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
  textureOverlayAlpha: z.string().optional(),
  textureCardBlur: z.string().optional(),
  titleInk: z.string().optional(),
  sectionTitle: z.string().optional(),
  metaText: z.string().optional(),
  iconDefault: z.string().optional(),
  iconActive: z.string().optional(),
  focus: z.string().optional(),
  panelFill: z.string().optional(),
  panelMuted: z.string().optional(),
  selectedBg: z.string().optional(),
  selectedBorder: z.string().optional(),
  focusBg: z.string().optional(),
  focusBorder: z.string().optional(),
  actionBg: z.string().optional(),
  actionHover: z.string().optional(),
  actionText: z.string().optional(),
  borderRadius: z.string().optional(),
});

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

export const GraphStyleConfigSchema = z.object({
  nodeShape: z.string(),
  edgeStyle: z.enum(["solid", "dashed", "dotted"]),
  nodeBorderWidth: z.number(),
  edgeWidth: z.number().default(1),
  edgeColor: z.string(),
});

export type GraphStyleConfig = z.infer<typeof GraphStyleConfigSchema>;

export const JargonMapSchema = z
  .object({
    vault: z.string(),
    entity: z.string(),
    entity_plural: z.string(),
    save: z.string(),
    delete: z.string(),
    search: z.string(),
    new: z.string(),
    syncing: z.string(),
    lore_header: z.string(),
    lore_secrets: z.string(),
    chronicle_header: z.string(),
    connections_header: z.string(),
    tab_status: z.string(),
    tab_lore: z.string(),
    tab_inventory: z.string(),
    graph_loading: z.string(),
  })
  .partial()
  .catchall(z.string());

export const StylingTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(""),
  tokens: ThemeTokensSchema,
  graph: GraphStyleConfigSchema,
  jargon: JargonMapSchema.optional(),
});

export type StylingTemplate = z.infer<typeof StylingTemplateSchema>;

export const DEFAULT_JARGON: JargonMap = {
  vault: "Vault",
  entity: "Note",
  entity_plural: "Notes",
  save: "Save",
  delete: "Delete",
  search: "Search",
  new: "New",
  syncing: "Syncing",
  lore_header: "Detailed Records",
  lore_secrets: "Deep Lore & Secrets",
  chronicle_header: "Chronicle",
  connections_header: "Connections",
  tab_status: "Status",
  tab_lore: "Lore & Notes",
  tab_inventory: "Inventory",
  blog_entry: "Archive Entry",
  blog_action: "Read Full Entry",
  graph_loading: "Initializing...",
};

export type AppAppearanceId = "neutral-light" | "neutral-dark" | "system";
export type ResolvedAppAppearanceId = "neutral-light" | "neutral-dark";
