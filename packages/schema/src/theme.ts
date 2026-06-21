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

export const WORKSPACE_DARK: StylingTemplate = {
  id: "workspace_dark",
  name: "Workspace (Dark)",
  description:
    "Neutral dark workspace with a warm dark gray palette and restrained gold accent.",
  tokens: {
    primary: "#d6d3d1",
    secondary: "#a8a29e",
    background: "#1c1917",
    surface: "#292524",
    text: "#f5f5f4",
    border: "rgba(68, 64, 60, 1)",
    accent: "#c8973a",
    texture: "workspace_grain.svg",
    fontHeader: "'Fraunces', serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "8px",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#44403c",
  },
};

export const THEMES = {
  workspace: {
    id: "workspace",
    name: "Workspace (Light)",
    description:
      "Neutral light workspace with a warm gray palette and restrained gold accent.",
    tokens: {
      primary: "#57534e",
      secondary: "#78716c",
      background: "#fafaf9",
      surface: "#ffffff",
      text: "#1c1917",
      border: "rgba(231, 229, 228, 1)",
      accent: "#c8973a",
      texture: "workspace_grain.svg",
      fontHeader: "'Fraunces', serif",
      fontBody: "'Inter', sans-serif",
      borderRadius: "8px",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#d6d3d1",
    },
  },
  scifi: {
    id: "scifi",
    name: "Sci-Fi Terminal",
    description:
      "Science fiction, terminal-style interfaces, advanced technology, AI systems, and frontier operations in a futuristic setting.",
    tokens: {
      primary: "#4ade80",
      secondary: "#86efac",
      background: "#050505",
      surface: "#0c0c0c",
      text: "#86efac",
      border: "rgba(22, 163, 74, 0.5)",
      accent: "#a855f7",
      texture: "scifi_grid.svg",
      textureOverlayAlpha: "CC",
      fontHeader: "'Orbitron', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "ellipse",
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
      blog_entry: "Intel Report",
      blog_action: "Decrypt Full Entry",
      graph_loading: "Initiating Neural Interface...",
    },
  },
  fantasy: {
    id: "fantasy",
    name: "Ancient Parchment",
    description:
      "Classic fantasy, magic, kingdoms, quests, ancient relics, and the broad language of swords, sorcery, and legend.",
    tokens: {
      primary: "#5e3018", // Warm Mahogany — red-brown undertone, interactive/primary elements
      secondary: "#423830", // Cool Umber — grey-brown undertone, structural/secondary elements
      background: "#fdf6e3", // Parchment
      surface: "#f0ddb8", // Aged Vellum — softer than #ead4a8, still distinct from parchment bg but not harsh
      text: "#2a2018", // Inked Text — warm, stays warm (body copy reads as hand-inked)
      border: "rgba(94, 48, 24, 0.52)", // Stronger border — up from 0.34, uses richer primary
      accent: "#c8973a", // Jeweller's Gold — highlights and active states
      fontHeader: "'Alegreya', serif",
      fontBody: "'Inter', sans-serif",
      texture: "parchment.svg",
      titleInk: "#24180f", // Warmest — titles and headings anchor the hierarchy
      sectionTitle: "#3a3225", // Cool Umber — section labels are structural, not primary; slightly olive-grey
      metaText: "#6b5e50", // Cool Grey-Brown — metadata, timestamps; neutral to recede behind content
      iconDefault: "#6b5e4e", // Cool Grey-Brown — inactive icons match metaText register
      iconActive: "#5e3018", // Warm — active icon matches primary
      focus: "#c8973a", // Updated to match new accent gold
      panelFill: "color-mix(in srgb, #f0ddb8, #fdf6e3 62%)", // 38% vellum — panels recede further toward parchment bg
      panelMuted: "color-mix(in srgb, #f0ddb8, #fdf6e3 74%)", // Even lighter — secondary panel surfaces near-invisible
      selectedBg: "color-mix(in srgb, #c8973a, #fdf6e3 88%)", // Faint gold tint on hover — was brown-tinted, now gold-tinted
      selectedBorder: "color-mix(in srgb, #c8973a, #fdf6e3 42%)", // Gold-based (was brown) — guides eye on section headings and tab separator
      focusBg: "color-mix(in srgb, #c8973a, #fdf6e3 72%)", // 28% gold tint — light enough for dark text to read clearly on it
      focusBorder: "#c8973a", // Raw gold — no dilution on active tab border
      actionBg: "color-mix(in srgb, #5e3018, #fdf6e3 74%)",
      actionHover: "color-mix(in srgb, #5e3018, #fdf6e3 64%)",
      actionText: "#24180f",
      borderRadius: "3px",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeWidth: 2, // Bolder — connections need to win against parchment bg
      edgeColor: "#6b3820", // Deep Mahogany — updated to complement richer primary
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
      blog_entry: "Chronicle Dispatch",
      blog_action: "Read Full Entry",
      graph_loading: "Summoning Chronicles...",
    },
  },
  modern: {
    id: "modern",
    name: "Clean Modern",
    description:
      "Contemporary, grounded stories set in the present day, with a clean modern tone suited to realism, institutions, and everyday life.",
    tokens: {
      primary: "#2563eb",
      secondary: "#1d4ed8",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      border: "rgba(203, 213, 225, 1)",
      accent: "#4f46e5",
      texture: "modern_dots.svg",
      fontHeader: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#cbd5e1",
    },
    jargon: {
      blog_entry: "Article",
      blog_action: "Read Full Article",
      graph_loading: "Establishing Data Link...",
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Neon Night",
    description:
      "Cyberpunk, neon-noir, corporate control, street-level rebellion, hackers, implants, and high-tech urban danger.",
    tokens: {
      primary: "#f472b6",
      secondary: "#f9a8d4",
      background: "#020617",
      surface: "#0f172a",
      text: "#22d3ee",
      border: "rgba(244, 114, 182, 0.6)",
      accent: "#facc15",
      texture: "cyberpunk.svg",
      fontHeader: "'Fira Code', monospace",
      fontBody: "'Fira Code', monospace",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "dashed",
      nodeBorderWidth: 2,
      edgeWidth: 1,
      edgeColor: "#db2777",
    },
    jargon: {
      vault: "Grid",
      entity: "Node",
      entity_plural: "Nodes",
      save: "Hack",
      delete: "Flatline",
      new: "Boot",
      syncing: "Uplinking",
      search: "Scan",
      lore_header: "Databank",
      lore_secrets: "Black ICE",
      chronicle_header: "System Log",
      connections_header: "Network",
      tab_status: "Vitals",
      tab_lore: "Neural Feed",
      tab_inventory: "Loadout",
      blog_entry: "Data Breach",
      blog_action: "Analyze Transmission",
      graph_loading: "Uplinking to Grid...",
    },
  },
  apocalyptic: {
    id: "apocalyptic",
    name: "Wasteland",
    description:
      "Post-apocalyptic survival, scavenging, ruined worlds, harsh frontiers, collapse, and the struggle to rebuild after catastrophe.",
    tokens: {
      primary: "#f97316",
      secondary: "#fdba74",
      background: "#1c1917",
      surface: "#292524",
      text: "#ececec",
      border: "rgba(120, 113, 108, 0.5)",
      accent: "#f87171",
      fontHeader: "'Courier Prime', monospace",
      fontBody: "'Courier Prime', monospace",
      texture: "rust.svg",
    },
    graph: {
      nodeShape: "ellipse",
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
      blog_entry: "Salvaged Log",
      blog_action: "Extract Fragment",
      graph_loading: "Scavenging Fragments...",
    },
  },
  horror: {
    id: "horror",
    name: "Blood & Noir",
    description:
      "Gothic horror, vampires, occult secrecy, predation, noir investigation, and the moral decay of the damned.",
    tokens: {
      primary: "#dc2626", // Blood Red (Vibrant)
      secondary: "#f87171",
      background: "#050505",
      surface: "#121212",
      text: "#f3f4f6", // Off-white (Body)
      border: "rgba(220, 38, 38, 0.3)",
      accent: "#991b1b", // Crimson (Deep accent)
      fontHeader: "'Spectral', serif",
      fontBody: "'Spectral', serif",
      texture: "blood.svg",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeWidth: 1,
      edgeColor: "#991b1b",
    },
    jargon: {
      vault: "Archive",
      entity: "Subject",
      entity_plural: "Subjects",
      save: "Seal",
      delete: "Ash",
      new: "Embrace",
      syncing: "Pulsing",
      search: "Hunt",
      lore_header: "The Book of Nod",
      lore_secrets: "The Gehenna Signs",
      chronicle_header: "Elysium Records",
      connections_header: "Blood Bonds",
      tab_status: "Condition",
      tab_lore: "Memoriam",
      tab_inventory: "Assets",
      blog_entry: "Tome Entry",
      blog_action: "Examine Records",
      graph_loading: "Awakening Memories...",
    },
  },
  fallout: {
    id: "fallout",
    name: "Pip-Boy Terminal",
    description:
      "Retro-futurist wasteland survival, vault culture, radiation scars, scavenged technology, and the afterlife of a broken civilization.",
    tokens: {
      primary: "#39ff14", // Pip-Boy neon green
      secondary: "#86efac",
      background: "#0a0a08",
      // Near-black CRT background
      surface: "#111109", // Slightly lighter terminal surface
      text: "#a8ff78", // Soft phosphor green text
      border: "rgba(57, 255, 20, 0.4)",
      accent: "#f5c518", // Amber/yellow gauge indicator
      fontHeader: "'Share Tech Mono', monospace",
      fontBody: "'Share Tech Mono', monospace",
      texture: "crt.svg",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#2db110",
    },
    jargon: {
      vault: "Pip-Boy",
      entity: "Entry",
      entity_plural: "Entries",
      save: "Holotape",
      delete: "Purge",
      new: "New Log",
      syncing: "Transmitting",
      search: "V.A.T.S. Scan",
      lore_header: "Pip-Boy Data",
      lore_secrets: "Classified Files & Vault Secrets",
      chronicle_header: "Wasteland Journal",
      connections_header: "Factions & Allies",
      tab_status: "S.P.E.C.I.A.L.",
      tab_lore: "Pip-Boy Data",
      tab_inventory: "Inventory",
      blog_entry: "Holotape",
      blog_action: "Play Message",
      graph_loading: "Accessing Vault-Tec Network...",
    },
  },
  starwars: {
    id: "starwars",
    name: "Galactic Holocron",
    description:
      "Space opera, galactic conflict, ancient orders, rebellion, destiny, mysticism, and sweeping interstellar drama.",
    tokens: {
      primary: "#FFE81F", // Star Wars Yellow
      secondary: "#cbd5e1", // Light Grey
      background: "#000000", // Space Black
      surface: "#0F172A", // Star Destroyer Interior
      text: "#E2E8F0", // Starlight White
      border: "rgba(74, 144, 226, 0.5)", // Lightsaber Blue
      accent: "#EF4444", // Sith Red
      texture: "holocron.svg",
      fontHeader: "'Orbitron', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#4A90E2", // Lightsaber Blue
    },
    jargon: {
      vault: "Holocron",
      entity: "Data Pad",
      entity_plural: "Data Pads",
      save: "Encrypt",
      delete: "Purge",
      new: "Initialize",
      syncing: "Transmitting",
      search: "Scan",
      lore_header: "Imperial Archives",
      lore_secrets: "Forbidden Intel & Jedi Secrets",
      chronicle_header: "System Logs",
      connections_header: "Alliances",
      tab_status: "Vitals",
      tab_lore: "Archives",
      tab_inventory: "Cargo",
      blog_entry: "Intelligence Report",
      blog_action: "Analyze Intel",
      graph_loading: "Navigating Hyperspace...",
    },
  },
  startrek: {
    id: "startrek",
    name: "LCARS Interface",
    description:
      "Optimistic science fiction, starship exploration, diplomacy, discovery, and a hopeful future guided by reason and curiosity.",
    tokens: {
      primary: "#FF9900", // Okudagram Orange
      secondary: "#fbcfe8", // Light Purple
      background: "#000000", // Space Black
      surface: "#111111", // Console Background
      text: "#FFFFFF", // Standard White
      border: "rgba(255, 153, 0, 0.4)", // Orange Glow
      accent: "#FF3333", // Vulcan Red
      texture: "stellar_map.svg",
      fontHeader: "'Orbitron', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#99CCFF", // Federation Blue
    },
    jargon: {
      vault: "LCARS Data Bank",
      entity: "Personnel File",
      entity_plural: "Personnel Files",
      save: "Log",
      delete: "Purge",
      new: "Authorize",
      syncing: "Establishing Link...",
      search: "Analyze",
      lore_header: "Federation Database",
      lore_secrets: "Classified & Section 31 Files",
      chronicle_header: "Stardate Logs",
      connections_header: "Comm-link",
      tab_status: "Bio-Signs",
      tab_lore: "Mission Data",
      tab_inventory: "Equipment",
      blog_entry: "Mission Log",
      blog_action: "View Records",
      graph_loading: "Scanning Sector...",
    },
  },
  lancer: {
    id: "lancer",
    name: "Cockpit Terminal",
    description:
      "Lancer RPG tactical campaign management: mechs, pilots, factions, and frontier operations viewed from inside the cockpit.",
    tokens: {
      primary: "#22d3ee", // Union cyan
      secondary: "#67b8cc", // Muted cyan
      background: "#0b0f17", // Near-black navy
      surface: "#121c28", // Dark blue-grey
      text: "#c8e6f0", // Pale blue-white
      border: "rgba(34, 211, 238, 0.22)",
      accent: "#f97316", // Safety orange
      texture: "tactical_hud.svg",
      fontHeader: "'Share Tech Mono', monospace",
      fontBody: "'Inter', sans-serif",
      borderRadius: "2px",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#1a3a4a",
    },
    jargon: {
      vault: "Operations Database",
      entity: "Asset",
      entity_plural: "Assets",
      save: "Commit",
      delete: "Decommission",
      new: "Register",
      syncing: "Syncing",
      search: "Scan",
      lore_header: "Dossier",
      lore_secrets: "Classified Intel & Redacted Files",
      chronicle_header: "Mission Brief",
      connections_header: "Uplinks",
      tab_status: "Telemetry",
      tab_lore: "Field Notes",
      tab_inventory: "Systems & Assets",
      blog_entry: "Field Report",
      blog_action: "Read Full Report",
      graph_loading: "Initialising Tactical Network...",
    },
  },
  western: {
    id: "western",
    name: "Frontier Town",
    description:
      "Western, cowboys, outlaws, saloons, frontier homesteads, and trails under a wide desert sun.",
    tokens: {
      primary: "#8c5a3c",
      secondary: "#5c4033",
      background: "#f5ece1",
      surface: "#eaddcc",
      text: "#3d2a1f",
      border: "rgba(140, 90, 60, 0.4)",
      accent: "#d48227",
      fontHeader: "'Alegreya', serif",
      fontBody: "'Inter', sans-serif",
      borderRadius: "4px",
      texture: "parchment.svg",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#8c5a3c",
    },
    jargon: {
      vault: "Logbook",
      entity: "Record",
      entity_plural: "Records",
      save: "Secure",
      delete: "Bury",
      new: "Draft",
      syncing: "Stashing",
      search: "Track",
      lore_header: "Frontier Lore",
      lore_secrets: "Bounties & Whispers",
      chronicle_header: "Trail Log",
      connections_header: "Ties",
      tab_status: "Status",
      tab_lore: "Dossier",
      tab_inventory: "Stash",
      blog_entry: "Frontier Dispatch",
      blog_action: "Read Dispatch",
      graph_loading: "Mapping the Trail...",
    },
  },
  steampunk: {
    id: "steampunk",
    name: "Brass & Aether",
    description:
      "Victorian-era industrialism, guild conspiracies, aetheric engines, airships, and the dark underside of mechanical progress.",
    tokens: {
      primary: "#c9921a",
      secondary: "#d4a852",
      background: "#0d0b08",
      surface: "#1a1510",
      text: "#e8dcc8",
      border: "rgba(201, 146, 26, 0.35)",
      accent: "#b34b1a",
      fontHeader: "'Spectral', serif",
      fontBody: "'Spectral', serif",
      texture: "rust.svg",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 2,
      edgeWidth: 1,
      edgeColor: "#7a5c12",
    },
    jargon: {
      vault: "Schematics Vault",
      entity: "Blueprint",
      entity_plural: "Blueprints",
      save: "Engrave",
      delete: "Smelt",
      new: "Draft",
      syncing: "Calibrating",
      search: "Survey",
      lore_header: "Technical Dossier",
      lore_secrets: "Sealed Schematics & Guild Secrets",
      chronicle_header: "Expedition Log",
      connections_header: "Contacts & Contracts",
      tab_status: "Vitals",
      tab_lore: "Dossier",
      tab_inventory: "Equipment",
      blog_entry: "Field Report",
      blog_action: "File Report",
      graph_loading: "Calibrating Aetheric Network...",
    },
  },
  "space-opera-resistance": {
    id: "space-opera-resistance",
    name: "Galactic Resistance",
    description:
      "Space opera rebellion, imperial fleets, ancient mystics, and frontier outposts.",
    tokens: {
      primary: "#eab308",
      secondary: "#fef08a",
      background: "#020617",
      surface: "#0f172a",
      text: "#f8fafc",
      border: "rgba(234, 179, 8, 0.4)",
      accent: "#ef4444",
      texture: "resistance_console.svg",
      fontHeader: "'Orbitron', sans-serif",
      fontBody: "'Inter', sans-serif",
      borderRadius: "2px",
    },
    graph: {
      nodeShape: "ellipse",
      edgeStyle: "solid",
      nodeBorderWidth: 1,
      edgeWidth: 1,
      edgeColor: "#334155",
    },
    jargon: {
      vault: "Datacron",
      entity: "Intel",
      entity_plural: "Intel",
      save: "Encrypt",
      delete: "Purge",
      new: "Initialize",
      syncing: "Transmitting",
      search: "Scan",
      lore_header: "Rebellion Archives",
      lore_secrets: "Classified Imperial Data",
      chronicle_header: "Mission Logs",
      connections_header: "Network",
      tab_status: "Vitals",
      tab_lore: "Dossier",
      tab_inventory: "Cargo",
      blog_entry: "Intercepted Transmission",
      blog_action: "Decode Transmission",
      graph_loading: "Accessing Imperial Network...",
    },
  },
} as const satisfies Record<string, StylingTemplate>;

export const FANTASY_DARK: StylingTemplate = {
  id: "fantasy_dark",
  name: "Candlelit Tome",
  description:
    "Aged leather and brass by candlelight; the dark counterpart to Ancient Parchment.",
  tokens: {
    primary: "#d4a85a",
    secondary: "#8b6532",
    background: "#1c1410",
    surface: "#2a1e16",
    text: "#e8ddc4",
    border: "rgba(212, 168, 90, 0.32)",
    accent: "#f0c879",
    fontHeader: "'Alegreya', serif",
    fontBody: "'Alegreya', serif",
    texture: "leather.svg",
    borderRadius: "3px",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 2,
    edgeWidth: 2,
    edgeColor: "#8b6532",
  },
  jargon: THEMES.fantasy.jargon,
};

export const MODERN_DARK: StylingTemplate = {
  id: "modern_dark",
  name: "After Hours",
  description: "Contemporary styling in a dark slate variant.",
  tokens: {
    primary: "#60a5fa",
    secondary: "#93c5fd",
    background: "#09090b",
    surface: "#18181b",
    text: "#f4f4f5",
    border: "rgba(96, 165, 250, 0.3)",
    accent: "#a78bfa",
    texture: "modern_dots.svg",
    fontHeader: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#3f3f46",
  },
  jargon: THEMES.modern.jargon,
};

export const SCIFI_LIGHT: StylingTemplate = {
  id: "scifi_light",
  name: "Clean Room",
  description:
    "Science fiction interface in a high-contrast light green terminal variant.",
  tokens: {
    primary: "#15803d",
    secondary: "#166534",
    background: "#f0f4ec",
    surface: "#ffffff",
    text: "#14532d",
    border: "rgba(21, 128, 61, 0.3)",
    accent: "#7e22ce",
    texture: "scifi_grid.svg",
    textureOverlayAlpha: "CC",
    fontHeader: "'Orbitron', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#86efac",
  },
  jargon: THEMES.scifi.jargon,
};

export const CYBERPUNK_LIGHT: StylingTemplate = {
  id: "cyberpunk_light",
  name: "Vapor Dawn",
  description: "Cyberpunk styling in a neon pink and cyan light-mode variant.",
  tokens: {
    primary: "#be185d",
    secondary: "#9d174d",
    background: "#fdf2f8",
    surface: "#ffffff",
    text: "#155e75",
    border: "rgba(190, 24, 93, 0.35)",
    accent: "#b45309",
    texture: "cyberpunk.svg",
    fontHeader: "'Fira Code', monospace",
    fontBody: "'Fira Code', monospace",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "dashed",
    nodeBorderWidth: 2,
    edgeWidth: 1,
    edgeColor: "#be185d",
  },
  jargon: THEMES.cyberpunk.jargon,
};

export const APOCALYPTIC_LIGHT: StylingTemplate = {
  id: "apocalyptic_light",
  name: "Sun-Bleached",
  description:
    "Post-apocalyptic survival styling in a light sand/dust variant.",
  tokens: {
    primary: "#9a3412",
    secondary: "#7c2d12",
    background: "#f0e9d6",
    surface: "#e8dfc6",
    text: "#292524",
    border: "rgba(154, 52, 18, 0.3)",
    accent: "#991b1b",
    fontHeader: "'Courier Prime', monospace",
    fontBody: "'Courier Prime', monospace",
    texture: "rust.svg",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "dotted",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#9a3412",
  },
  jargon: THEMES.apocalyptic.jargon,
};

export const HORROR_LIGHT: StylingTemplate = {
  id: "horror_light",
  name: "Autopsy Report",
  description:
    "Gothic horror styling in a striking light crimson and ash variant.",
  tokens: {
    primary: "#7f1d1d",
    secondary: "#450a0a",
    background: "#f1eee5",
    surface: "#fafaf6",
    text: "#1c1917",
    border: "rgba(127, 29, 29, 0.25)",
    accent: "#581c87",
    texture: "autopsy_smudge.svg",
    fontHeader: "'Spectral', serif",
    fontBody: "'Spectral', serif",
    borderRadius: "0px",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 2,
    edgeWidth: 1,
    edgeColor: "#7f1d1d",
  },
  jargon: THEMES.horror.jargon,
};

export const FALLOUT_LIGHT: StylingTemplate = {
  id: "fallout_light",
  name: "Vault-Tec Bulletin",
  description: "Retro-futurist terminal in a light phosphor green variant.",
  tokens: {
    primary: "#1e40af",
    secondary: "#1e3a8a",
    background: "#f8f3e1",
    surface: "#ffffff",
    text: "#292524",
    border: "rgba(30, 64, 175, 0.3)",
    accent: "#d97706",
    texture: "vault_blueprint.svg",
    fontHeader: "'Share Tech Mono', monospace",
    fontBody: "'Share Tech Mono', monospace",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#1e3a8a",
  },
  jargon: THEMES.fallout.jargon,
};

export const STARWARS_LIGHT: StylingTemplate = {
  id: "starwars_light",
  name: "Jedi Archives",
  description:
    "Space opera styling in a crisp starlight and jedi-blue variant.",
  tokens: {
    primary: "#1e3a8a",
    secondary: "#1d4ed8",
    background: "#f5f0e3",
    surface: "#fbf6e8",
    text: "#292524",
    border: "rgba(30, 58, 138, 0.3)",
    accent: "#b45309",
    texture: "holocron.svg",
    fontHeader: "'Orbitron', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#1e3a8a",
  },
  jargon: THEMES.starwars.jargon,
};

export const STARTREK_LIGHT: StylingTemplate = {
  id: "startrek_light",
  name: "Stellar Cartography",
  description: "Hopeful starship console styling in a light Okudagram variant.",
  tokens: {
    primary: "#c2410c",
    secondary: "#ea580c",
    background: "#f1f4f6",
    surface: "#ffffff",
    text: "#1e293b",
    border: "rgba(194, 65, 12, 0.3)",
    accent: "#6d28d9",
    texture: "stellar_map.svg",
    fontHeader: "'Orbitron', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#c2410c",
  },
  jargon: THEMES.startrek.jargon,
};

export const LANCER_LIGHT: StylingTemplate = {
  id: "lancer_light",
  name: "Hangar Briefing",
  description:
    "Lancer RPG in a clean hangar/briefing-room light variant — planning, prep, and campaign management.",
  tokens: {
    primary: "#1d4ed8", // Deep cobalt / Union blue
    secondary: "#2563eb", // Medium blue
    background: "#f1f4f7", // Warm off-white
    surface: "#ffffff", // Clean white
    text: "#1e2d42", // Slate navy
    border: "rgba(29, 78, 216, 0.25)",
    accent: "#ea580c", // Orange hazard stripe
    texture: "tactical_hud.svg",
    fontHeader: "'Share Tech Mono', monospace",
    fontBody: "'Inter', sans-serif",
    borderRadius: "2px",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#1d4ed8",
  },
  jargon: THEMES.lancer.jargon,
};

export const WESTERN_DARK: StylingTemplate = {
  id: "western_dark",
  name: "Midnight Saloon",
  description:
    "Gunslingers, cardsharps, and dark secrets by a saloon oil lamp; the dark counterpart to Frontier Town.",
  tokens: {
    primary: "#d48227",
    secondary: "#a0785a",
    background: "#1a120c",
    surface: "#2b1e15",
    text: "#f0e6dc",
    border: "rgba(212, 130, 39, 0.3)",
    accent: "#e6994d",
    fontHeader: "'Alegreya', serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "4px",
    texture: "leather.svg",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#a0785a",
  },
  jargon: THEMES.western.jargon,
};

export const STEAMPUNK_DARK: StylingTemplate = {
  id: "steampunk_dark",
  name: "Midnight Foundry",
  description:
    "Steampunk industrialism in a deep coal-black variant — soot, shadow, and smouldering copper.",
  tokens: {
    primary: "#d4a852",
    secondary: "#c9921a",
    background: "#070503",
    surface: "#110e09",
    text: "#f0e8d5",
    border: "rgba(212, 168, 82, 0.3)",
    accent: "#c05e1a",
    fontHeader: "'Spectral', serif",
    fontBody: "'Spectral', serif",
    texture: "rust.svg",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 2,
    edgeWidth: 1,
    edgeColor: "#7a5c12",
  },
  jargon: THEMES.steampunk.jargon,
};

export const SPACE_OPERA_RESISTANCE_DARK: StylingTemplate = {
  id: "space-opera-resistance_dark",
  name: "Imperial Dreadnought",
  description:
    "Dark, oppressive imperial dreadnought styling — steel grays, warning reds, and shadow.",
  tokens: {
    primary: "#ef4444",
    secondary: "#b91c1c",
    background: "#000000",
    surface: "#09090b",
    text: "#e2e8f0",
    border: "rgba(239, 68, 68, 0.3)",
    accent: "#eab308",
    texture: "resistance_console.svg",
    fontHeader: "'Orbitron', sans-serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "0px",
  },
  graph: {
    nodeShape: "ellipse",
    edgeStyle: "solid",
    nodeBorderWidth: 1,
    edgeWidth: 1,
    edgeColor: "#1e293b",
  },
  jargon: THEMES["space-opera-resistance"].jargon,
};

export const DEFAULT_THEME = THEMES.workspace;

export type AppAppearanceId = "neutral-light" | "neutral-dark" | "system";
export type ResolvedAppAppearanceId = "neutral-light" | "neutral-dark";
export type WorldThemeId = keyof typeof THEMES;
