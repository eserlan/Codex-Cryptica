const GENERATOR_SLUGS = new Set([
  "npc",
  "settlement",
  "magic-item",
  "faction",
  "quest",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "cyberpunk-megacorp",
  "fantasy-guild",
  "sci-fi-faction",
  "wasteland-faction",
]);

export function shouldSyncGeneratorTheme(slug: string) {
  return GENERATOR_SLUGS.has(slug);
}
