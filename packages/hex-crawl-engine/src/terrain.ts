import { z } from "zod";

/** Default terrain presets (FR-005, research D17). Icons are Iconify Lucide classes. */
export const PRESET_TERRAIN_IDS = [
  "plains",
  "forest",
  "hills",
  "mountains",
  "swamp",
  "desert",
  "water",
  "coast",
  "tundra",
] as const;

export type TerrainId = (typeof PRESET_TERRAIN_IDS)[number];

export type Terrain =
  { kind: "preset"; id: TerrainId } | { kind: "custom"; label: string };

export const CUSTOM_TERRAIN_MAX_LENGTH = 40;

export const TERRAIN_CATALOGUE: Readonly<
  Record<TerrainId, { label: string; icon: string }>
> = {
  plains: { label: "Plains", icon: "icon-[lucide--wheat]" },
  forest: { label: "Forest", icon: "icon-[lucide--trees]" },
  hills: { label: "Hills", icon: "icon-[lucide--land-plot]" },
  mountains: { label: "Mountains", icon: "icon-[lucide--mountain]" },
  swamp: { label: "Swamp", icon: "icon-[lucide--droplets]" },
  desert: { label: "Desert", icon: "icon-[lucide--sun]" },
  water: { label: "Water", icon: "icon-[lucide--waves]" },
  coast: { label: "Coast", icon: "icon-[lucide--anchor]" },
  tundra: { label: "Tundra", icon: "icon-[lucide--snowflake]" },
};

const CUSTOM_TERRAIN_ICON = "icon-[lucide--map-pin]";

export const TerrainSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), id: z.enum(PRESET_TERRAIN_IDS) }),
  z.object({
    kind: z.literal("custom"),
    label: z.string().trim().min(1).max(CUSTOM_TERRAIN_MAX_LENGTH),
  }),
]);

export function terrainLabel(terrain: Terrain): string {
  return terrain.kind === "preset"
    ? TERRAIN_CATALOGUE[terrain.id].label
    : terrain.label;
}

export function terrainIcon(terrain: Terrain): string {
  return terrain.kind === "preset"
    ? TERRAIN_CATALOGUE[terrain.id].icon
    : CUSTOM_TERRAIN_ICON;
}

/**
 * Turn typed input into terrain. Preset ids and labels match case-insensitively.
 * Anything else becomes custom terrain (trimmed, up to 40 characters).
 * Returns null for blank input or for custom text that is too long.
 */
export function parseTerrainInput(input: string): Terrain | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  for (const id of PRESET_TERRAIN_IDS) {
    if (id === lower || TERRAIN_CATALOGUE[id].label.toLowerCase() === lower) {
      return { kind: "preset", id };
    }
  }

  if (trimmed.length > CUSTOM_TERRAIN_MAX_LENGTH) return null;
  return { kind: "custom", label: trimmed };
}
