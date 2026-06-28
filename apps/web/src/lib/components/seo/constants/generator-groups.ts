// Paths that only make sense in a fantasy context
export const FANTASY_ONLY = new Set([
  "/generators/dnd-npc",
  "/generators/fantasy-names",
  "/generators/magic-item",
  "/generators/kingdom",
  "/generators/pantheon-generator",
  "/generators/god-generator",
  "/generators/tavern",
]);

// Paths specific to the horror/vampire theme
export const HORROR_ONLY = new Set(["/generators/vampire-clan"]);

export const GENERATOR_GROUPS = [
  {
    label: "Characters & Names",
    items: [
      { label: "RPG NPC Generator", path: "/generators/npc" },
      { label: "D&D NPC Generator", path: "/generators/dnd-npc" },
      { label: "Vampire Clan Generator", path: "/generators/vampire-clan" },
      { label: "RPG Name Generator", path: "/generators/names" },
      { label: "Fantasy Name Generator", path: "/generators/fantasy-names" },
    ],
  },
  {
    label: "Worldbuilding",
    items: [
      { label: "Faction Generator", path: "/generators/faction" },
      { label: "Settlement Generator", path: "/generators/settlement" },
      { label: "Kingdom Generator", path: "/generators/kingdom" },
      { label: "Nation Generator", path: "/generators/nation" },
      { label: "Pantheon Generator", path: "/generators/pantheon-generator" },
      { label: "God & Deity Generator", path: "/generators/god-generator" },
    ],
  },
  {
    label: "Adventure",
    items: [
      { label: "Quest Hook Generator", path: "/generators/quest" },
      { label: "Magic Item Generator", path: "/generators/magic-item" },
      { label: "Tavern Generator", path: "/generators/tavern" },
      { label: "Social Hub Generator", path: "/generators/social-hub" },
    ],
  },
];
