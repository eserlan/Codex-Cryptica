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
  })
  .catchall(z.string());

export const StylingTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
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
};

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
      edgeWidth: 1,
      edgeColor: "#14532d",
    },
    jargon: {
      vault: "Data Bank",
      entity: "Data Node",
      entity_plural: "Data Nodes",
      save: "Upload",
      delete: "Purge",
      new: "Initialize",
      syncing: "Transmitting",
      search: "Query",
      lore_header: "Intelligence Feed",
      lore_secrets: "Classified Data & Encryption",
      chronicle_header: "System Summary",
      connections_header: "Relational Map",
      tab_status: "Diagnostics",
      tab_lore: "Data Streams",
      tab_inventory: "Cargo",
    },
  },
  fantasy: {
    id: "fantasy",
    name: "Ancient Parchment",
    tokens: {
      primary: "#78350f", // Burnt Umber
      secondary: "#451a03", // Deep Brown
      background: "#fdf6e3", // Parchment
      surface: "#eee8d5", // Aged Paper
      text: "#2d241e", // Inked Text
      border: "rgba(120, 53, 15, 0.3)",
      accent: "#991b1b", // Dried Blood / Crimson
      fontHeader: "'Cinzel', serif",
      fontBody: "'Spectral', serif",
      texture: "parchment.svg",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeWidth: 2,
      edgeColor: "#5F4B3B", // Sepia Ink
    },
    jargon: {
      vault: "Archive",
      entity: "Chronicle",
      entity_plural: "Chronicles",
      save: "Inscribe",
      delete: "Burn",
      new: "Forge",
      syncing: "Preserving",
      search: "Divine",
      lore_header: "Ancient Inscription",
      lore_secrets: "Forgotten Prophecies & Hidden Runes",
      chronicle_header: "Tome",
      connections_header: "Bonds",
      tab_status: "Attributes",
      tab_lore: "Mythos",
      tab_inventory: "Possessions",
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
      edgeWidth: 1,
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
      edgeWidth: 1,
      edgeColor: "#db2777",
    },
    jargon: {
      vault: "Mainframe",
      entity: "Neural Trace",
      entity_plural: "Neural Traces",
      save: "Hack",
      delete: "Derez",
      new: "Jack In",
      syncing: "Uplinking",
      search: "Scan",
      lore_header: "Active Uplink",
      lore_secrets: "Black Projects & Corrupted Nodes",
      chronicle_header: "Neural Record",
      connections_header: "Network",
      tab_status: "Biometrics",
      tab_lore: "Neural Feed",
      tab_inventory: "Hardware",
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
      edgeWidth: 1,
      edgeColor: "#78716c",
    },
    jargon: {
      vault: "Bunker",
      entity: "Scrap",
      entity_plural: "Scraps",
      save: "Salvage",
      delete: "Scuttle",
      new: "Scavenge",
      syncing: "Patching",
      search: "Scout",
      lore_header: "Salvaged Log",
      lore_secrets: "Radioactive Files & Buried Rumors",
      chronicle_header: "Fragment",
      connections_header: "Ties",
      tab_status: "Vitals",
      tab_lore: "Memories",
      tab_inventory: "Stash",
    },
  },
  horror: {
    id: "horror",
    name: "Blood & Noir",
    tokens: {
      primary: "#dc2626", // Blood Red (Vibrant)
      secondary: "#ef4444", // Bright Red (Readable muted labels)
      background: "#050505",
      surface: "#121212",
      text: "#f3f4f6", // Off-white (Body)
      border: "rgba(220, 38, 38, 0.3)",
      accent: "#991b1b", // Crimson (Deep accent)
      fontHeader: "'Spectral', serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "round-rectangle",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeWidth: 1,
      edgeColor: "#991b1b",
    },
    jargon: {
      vault: "Crypt",
      entity: "Victim",
      entity_plural: "Victims",
      save: "Seal",
      delete: "Banish",
      new: "Exhume",
      syncing: "Bleeding",
      search: "Hunt",
      lore_header: "Forbidden Knowledge",
      lore_secrets: "Unspeakable Horrors & Eldritch Truths",
      chronicle_header: "Last Will",
      connections_header: "Chains",
      tab_status: "Condition",
      tab_lore: "Whispers",
      tab_inventory: "Remains",
    },
  },
};

export const DEFAULT_THEME = THEMES.fantasy;
