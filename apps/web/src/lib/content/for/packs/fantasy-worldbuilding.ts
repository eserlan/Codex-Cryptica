import type { LandingPageConfig } from "../schema";

export const fantasyWorldbuilding: LandingPageConfig = {
  slug: "fantasy-worldbuilding",
  kind: "genre",
  theme: "fantasy",
  seo: {
    title: "Codex Cryptica for Fantasy Worldbuilding",
    description:
      "Connect pantheons, kingdoms, artifacts, and lineages into a living world.",
  },
  hero: {
    title: "Codex Cryptica for Fantasy Worldbuilding",
    tagline:
      "Connect pantheons, kingdoms, artifacts, and lineages into a living world.",
    problemStatement:
      "Fantasy settings demand massive depth: royal bloodlines, rival guilds, ancient magic systems, and sprawling campaign timelines. Codex Cryptica turns flat world notes into a dynamic, connected graph.",
  },
  useCases: [
    {
      title: "Pantheons & Religions",
      description: "Track deities, divine domains, and holy orders.",
      icon: "icon-[lucide--sun]",
    },
    {
      title: "Kingdoms & Lineages",
      description: "Map royal families and political alliances.",
      icon: "icon-[lucide--crown]",
    },
  ],
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description: "Generate names for characters and places.",
      href: "/generators/fantasy-names",
      badge: "Generator",
    },
    {
      title: "Pantheon Generator",
      description: "Create deities and mythologies.",
      href: "/generators/pantheon-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Start Building",
    buttonText: "Try Codex Cryptica",
    buttonHref: "/app",
  },
};
