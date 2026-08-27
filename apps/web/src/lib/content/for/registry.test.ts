import { describe, it, expect } from "vitest";
import {
  getLandingPage,
  getAllLandingPages,
  getAllLandingPageSlugs,
  getLandingPagesForHub,
} from "./registry";
import { isHubThemeSlug } from "../hub-themes";
import type { LandingPageConfig } from "./schema";

describe("Landing Page Registry", () => {
  const mockRegistry: Record<string, LandingPageConfig> = {
    "test-system": {
      slug: "test-system",
      kind: "system",
      seo: { title: "SEO Title", description: "SEO Desc" },
      hero: { title: "Hero", tagline: "Tag", problemStatement: "Prob" },
      useCases: [],
      recommendedTools: [],
      cta: { title: "CTA", buttonText: "Go", buttonHref: "/go" },
      disclaimer: "Not affiliated.",
    },
    "test-genre": {
      slug: "test-genre",
      kind: "genre",
      seo: { title: "SEO Title", description: "SEO Desc" },
      hero: { title: "Hero 2", tagline: "Tag 2", problemStatement: "Prob 2" },
      useCases: [],
      recommendedTools: [],
      cta: { title: "CTA 2", buttonText: "Go 2", buttonHref: "/go-2" },
    },
  };

  describe("getLandingPage", () => {
    it("returns the page config if it exists", () => {
      const page = getLandingPage("test-system", mockRegistry);
      expect(page).toBeDefined();
      expect(page?.slug).toBe("test-system");
    });

    it("returns undefined if the page config does not exist", () => {
      const page = getLandingPage("unknown-slug", mockRegistry);
      expect(page).toBeUndefined();
    });
  });

  describe("getAllLandingPages", () => {
    it("returns an array of all page configs", () => {
      const pages = getAllLandingPages(mockRegistry);
      expect(pages).toHaveLength(2);
      expect(pages[0].slug).toBe("test-system");
      expect(pages[1].slug).toBe("test-genre");
    });

    it("returns an empty array if registry is empty", () => {
      const pages = getAllLandingPages({});
      expect(pages).toHaveLength(0);
    });
  });

  describe("getAllLandingPageSlugs", () => {
    it("returns an array of slugs", () => {
      const slugs = getAllLandingPageSlugs(mockRegistry);
      expect(slugs).toHaveLength(2);
      expect(slugs).toContain("test-system");
      expect(slugs).toContain("test-genre");
    });
  });

  describe("Vampire: The Masquerade Pack", () => {
    it("is registered and has a disclaimer", () => {
      const vtm = getLandingPage("vampire-the-masquerade");
      expect(vtm).toBeDefined();
      expect(vtm?.slug).toBe("vampire-the-masquerade");
      expect(vtm?.disclaimer).toContain("Paradox Interactive");
    });

    it("uses authentic VtM terminology and Storyteller framing", () => {
      const vtm = getLandingPage("vampire-the-masquerade")!;
      const copy = JSON.stringify(vtm);

      // Avoid non-native / outsider combinations
      expect(copy).not.toMatch(/Primogen member/i);
      expect(copy).not.toMatch(/Elysium sanctuary|Elysium sanctuaries/i);
      expect(copy).not.toMatch(/human disguise|human disguises/i);
      expect(copy).not.toMatch(/coterie touchstone/i);
      expect(copy).not.toMatch(/Anarch cell/i);

      // Verify authentic terminology presence
      expect(vtm.hero.eyebrow).toBe("Edition-Agnostic Chronicle Management");
      expect(copy).toContain("Storyteller");
      expect(copy).toContain("Touchstones");
      expect(copy).toContain("Humanity");
      expect(copy).toContain("Masquerade");
      expect(copy).toContain("Anarch Coterie");
      expect(copy).toContain("Owes a major boon to");
    });
  });

  describe("Fantasy Worldbuilding Pack", () => {
    it("is registered and omits a disclaimer", () => {
      const fantasy = getLandingPage("fantasy-worldbuilding");
      expect(fantasy).toBeDefined();
      expect(fantasy?.slug).toBe("fantasy-worldbuilding");
      expect(fantasy?.disclaimer).toBeUndefined();
    });

    it("uses authentic worldbuilding terminology and concrete, system-agnostic setting concepts", () => {
      const fantasy = getLandingPage("fantasy-worldbuilding")!;
      const copy = JSON.stringify(fantasy);

      // Verify authentic worldbuilding concepts
      expect(fantasy.hero.eyebrow).toBe("Setting Lore & World Bible");
      expect(copy).toContain("pantheons");
      expect(copy).toContain("dynasties");
      expect(copy).toContain("provinces");
      expect(copy).toContain("schisms");
      expect(copy).toContain("artefacts");
      expect(copy).toContain("chronology");

      // Verify graph structure
      expect(fantasy.exampleGraph).toBeDefined();
      expect(fantasy.exampleGraph?.steps).toHaveLength(5);
      expect(fantasy.exampleGraph?.steps[0].label).toBe("Queen Maera II");
      expect(fantasy.exampleGraph?.steps[1].relation).toBe("Head of");
      expect(fantasy.exampleGraph?.steps[2].relation).toBe("Claims");
      expect(fantasy.exampleGraph?.steps[3].relation).toBe("Broke treaty with");
      expect(fantasy.exampleGraph?.steps[4].relation).toBe("Controls");
    });
  });

  describe("Dungeons & Dragons Pack", () => {
    it("is registered, marked as system, and includes non-affiliation disclaimer", () => {
      const dnd = getLandingPage("dungeons-and-dragons");
      expect(dnd).toBeDefined();
      expect(dnd?.slug).toBe("dungeons-and-dragons");
      expect(dnd?.kind).toBe("system");
      expect(dnd?.disclaimer).toContain("Wizards of the Coast");
      expect(dnd?.disclaimer).toContain("Hasbro");
      expect(dnd?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(
        dnd?.recommendedTools.some((t) => t.href.includes("dnd-npc")),
      ).toBe(true);
      expect(dnd?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Pathfinder 2e Pack", () => {
    it("is registered, marked as system, and includes non-affiliation disclaimer", () => {
      const pf2 = getLandingPage("pathfinder-2e");
      expect(pf2).toBeDefined();
      expect(pf2?.slug).toBe("pathfinder-2e");
      expect(pf2?.kind).toBe("system");
      expect(pf2?.disclaimer).toContain("Paizo Inc.");
      expect(pf2?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(
        pf2?.recommendedTools.some((t) =>
          t.href.includes("pantheon-generator"),
        ),
      ).toBe(true);
      expect(pf2?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Call of Cthulhu Pack", () => {
    it("is registered, marked as system, and includes non-affiliation disclaimer", () => {
      const coc = getLandingPage("call-of-cthulhu");
      expect(coc).toBeDefined();
      expect(coc?.slug).toBe("call-of-cthulhu");
      expect(coc?.kind).toBe("system");
      expect(coc?.theme).toBe("horror");
      expect(coc?.surfaceStyle).toBe("sharp");
      expect(coc?.disclaimer).toContain("Chaosium Inc.");
      expect(coc?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(coc?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });

    it("uses authentic Call of Cthulhu terminology and Keeper investigation framing", () => {
      const coc = getLandingPage("call-of-cthulhu")!;
      const copy = JSON.stringify(coc);

      // Avoid generic fantasy, stock horror over-use, or irrelevant framing
      expect(copy).not.toMatch(/questgiver|adventuring party|dungeon crawl/i);
      expect(copy).not.toMatch(/\bparty of heroes\b/i);
      expect(copy).not.toMatch(/\bloot tables?\b/i);
      expect(copy).not.toMatch(/complete local privacy/i);
      expect(copy).not.toMatch(/Miskatonic University/i);

      // Verify authentic terminology presence
      expect(coc.hero.eyebrow).toContain("Keeper");
      expect(copy).toContain("Keeper");
      expect(copy).toContain("Investigators");
      expect(copy).toContain("handouts");
      expect(copy).toContain("clues");
      expect(copy).toContain("scenarios");
      expect(copy).toContain("tomes");
      expect(copy).toContain("cults");
      expect(copy).toContain("Dr Evelyn Mercer");
      expect(copy).toContain("local-first");
      expect(coc.cta.buttonText).toContain("Investigation");
    });

    it("maintains a valid hub-and-spoke investigation graph with categorized nodes", () => {
      const coc = getLandingPage("call-of-cthulhu")!;
      const graph = coc.exampleGraph!;

      expect(graph.palette).toBe("oxblood");
      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("character");
      expect(hub.sublabel).toContain("Investigator");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Cryptic Telegram")?.sublabel,
      ).toBe("Handout • Telegram");
      expect(
        graph.steps.find((s) => s.label === "St Bartholomew's Archive")
          ?.relation,
      ).toBe("Researches at");
      expect(
        graph.steps.find((s) => s.label === "The Orne Society")?.sublabel,
      ).toBe("Cult");

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("character");
      expect(categories).toContain("faction");
      expect(categories).toContain("location");
      expect(categories).toContain("item");
    });
  });

  describe("Gothic Horror Pack", () => {
    it("is registered as genre, uses sharp styling, and omits non-affiliation disclaimer", () => {
      const gothic = getLandingPage("gothic-horror");
      expect(gothic).toBeDefined();
      expect(gothic?.slug).toBe("gothic-horror");
      expect(gothic?.kind).toBe("genre");
      expect(gothic?.theme).toBe("horror");
      expect(gothic?.surfaceStyle).toBe("sharp");
      expect(gothic?.disclaimer).toBeUndefined();
      expect(gothic?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(gothic?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });

    it("uses authentic gothic horror terminology and avoids stock dark fantasy / cosmic horror clichés", () => {
      const gothic = getLandingPage("gothic-horror")!;
      const copy = JSON.stringify(gothic);

      // Avoid generic fantasy, cosmic horror, or vampire-specific jargon
      expect(copy).not.toMatch(/questgiver|dungeon crawl|loot table/i);
      expect(copy).not.toMatch(/sanity check|eldritch|tentacles|sanitarium/i);
      expect(copy).not.toMatch(/blood bond|primogen|masquerade/i);
      expect(copy).not.toMatch(/complete local privacy/i);
      expect(copy).not.toMatch(/secretive parish vicar/i);
      expect(copy).not.toMatch(/generational pacts/i);
      expect(copy).not.toMatch(/locked lockboxes/i);
      expect(copy).not.toMatch(/estate topography/i);

      // Verify authentic gothic horror concepts and broadened non-aristocratic roles
      expect(gothic.hero.eyebrow).toContain("Gothic Horror");
      expect(copy).toContain("estates");
      expect(copy).toContain("heirlooms");
      expect(copy).toContain("parish");
      expect(copy).toContain("transgressions");
      expect(copy).toContain("governesses");
      expect(copy).toContain("clergy");
      expect(copy).toContain("Lady Elspeth Vale");
      expect(copy).toContain("Harrowmere House");
      expect(copy).toContain("local-first");

      // Verify tool titles are not capability-inflated
      const toolTitles = gothic.recommendedTools.map((t) => t.title);
      expect(toolTitles).toContain("NPC Generator");
      expect(toolTitles).toContain("Settlement Generator");
      expect(toolTitles).toContain("Secret Society Generator");
      expect(toolTitles).toContain("Magic Item Generator");
    });

    it("maintains a valid hub-and-spoke estate and lineage graph with categorized nodes", () => {
      const gothic = getLandingPage("gothic-horror")!;
      const graph = gothic.exampleGraph!;

      expect(graph.palette).toBe("oxblood");
      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("character");
      expect(hub.label).toBe("Lady Elspeth Vale");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Harrowmere House")?.relation,
      ).toBe("Inherits");
      expect(
        graph.steps.find((s) => s.label === "The West Wing Journal")?.relation,
      ).toBe("Uncovers");
      expect(
        graph.steps.find((s) => s.label === "The Society of the Hollow Bell")
          ?.sublabel,
      ).toBe("Aristocratic Society");
      expect(
        graph.steps.find((s) => s.label === "Sir Alaric Vale")?.relation,
      ).toBe("Descended from");

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("character");
      expect(categories).toContain("location");
      expect(categories).toContain("item");
      expect(categories).toContain("faction");
    });
  });

  describe("Cyberpunk RED Pack", () => {
    it("is registered, marked as system, uses sharp styling, and includes non-affiliation disclaimer", () => {
      const cp = getLandingPage("cyberpunk-red");
      expect(cp).toBeDefined();
      expect(cp?.slug).toBe("cyberpunk-red");
      expect(cp?.kind).toBe("system");
      expect(cp?.theme).toBe("cyberpunk");
      expect(cp?.surfaceStyle).toBe("sharp");
      expect(cp?.disclaimer).toContain("R. Talsorian Games");
      expect(cp?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(cp?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });

    it("uses authentic Cyberpunk RED terminology and avoids generic fantasy / automation claims", () => {
      const cp = getLandingPage("cyberpunk-red")!;
      const copy = JSON.stringify(cp);

      // Avoid generic fantasy clichés
      expect(copy).not.toMatch(/questgiver|dungeon crawl|loot table/i);
      expect(copy).not.toMatch(/\bparty of heroes\b/i);
      expect(copy).not.toMatch(/complete local privacy/i);

      // Avoid unsupported rules/automation claims
      expect(copy).not.toMatch(
        /character builder|rules automation|combat calculator/i,
      );

      // Verify authentic Time of the RED terminology
      expect(cp.hero.eyebrow).toContain("Time of the RED");
      expect(copy).toContain("Fixers");
      expect(copy).toContain("edgerunner");
      expect(copy).toContain("Combat Zone");
      expect(copy).toContain("boostergang");
      expect(copy).toContain("Nomad");
      expect(copy).toContain("datashards");
      expect(copy).toContain("Night Markets");
      expect(copy).toContain("Lifepath");
      expect(copy).toContain("choom");
      expect(copy).toContain("Jax Vance");
      expect(copy).toContain("Zetatech Operations");
      expect(copy).toContain("Iron Sights");
      expect(copy).toContain("local-first");
      expect(cp.cta.title).toBe("Map the Street. Run the Gig.");
    });

    it("maintains a valid hub-and-spoke gig and contact graph with categorized nodes", () => {
      const cp = getLandingPage("cyberpunk-red")!;
      const graph = cp.exampleGraph!;

      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("character");
      expect(hub.label).toBe("Jax Vance");
      expect(hub.sublabel).toContain("Fixer");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Zetatech Operations")?.relation,
      ).toBe("Brokers gig for");
      expect(graph.steps.find((s) => s.label === "Iron Sights")?.relation).toBe(
        "Has truce with",
      );
      expect(
        graph.steps.find((s) => s.label === "The Docks Container Yard")
          ?.relation,
      ).toBe("Coordinates drop at");
      expect(
        graph.steps.find((s) => s.label === "Encrypted Biometric Shard")
          ?.relation,
      ).toBe("Fences");
      expect(graph.steps.find((s) => s.label === "Rook")?.relation).toBe(
        "Hires",
      );
      expect(graph.steps.find((s) => s.label === "Rook")?.sublabel).toContain(
        "Solo",
      );

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("character");
      expect(categories).toContain("faction");
      expect(categories).toContain("location");
      expect(categories).toContain("item");
    });
  });

  describe("Dystopian Sci-Fi Pack", () => {
    it("is registered as genre, uses sharp styling, and omits non-affiliation disclaimer", () => {
      const dystopia = getLandingPage("dystopian-sci-fi");
      expect(dystopia).toBeDefined();
      expect(dystopia?.slug).toBe("dystopian-sci-fi");
      expect(dystopia?.kind).toBe("genre");
      expect(dystopia?.theme).toBe("cyberpunk");
      expect(dystopia?.hub).toBe("cyberpunk");
      expect(dystopia?.surfaceStyle).toBe("sharp");
      expect(dystopia?.disclaimer).toBeUndefined();
      expect(dystopia?.seo.image).toBe(
        "https://assets.codexcryptica.com/og/dystopian-sci-fi.jpg",
      );
      expect(dystopia?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(dystopia?.exampleGraph?.steps.length).toBeGreaterThanOrEqual(5);
    });

    it("uses authentic dystopian sci-fi worldbuilding terminology and avoids street-level cyberpunk tropes", () => {
      const dystopia = getLandingPage("dystopian-sci-fi")!;
      const copy = JSON.stringify(dystopia);

      // Avoid generic fantasy clichés
      expect(copy).not.toMatch(/questgiver|dungeon crawl|loot table/i);
      expect(copy).not.toMatch(/\bparty of heroes\b/i);

      // Avoid street-level Cyberpunk RED specific tropes
      expect(copy).not.toMatch(/\bedgerunner\b/i);
      expect(copy).not.toMatch(/\bboostergang\b/i);
      expect(copy).not.toMatch(/\bchoom\b/i);
      expect(copy).not.toMatch(/\bcyberdeck\b/i);
      expect(copy).not.toMatch(/\bnight market\b/i);

      // Verify authentic dystopian sci-fi systemic concepts
      expect(dystopia.hero.eyebrow).toContain("Dystopian Sci-Fi");
      expect(copy).toContain("regimes");
      expect(copy).toContain("surveillance");
      expect(copy).toContain("resistance");
      expect(copy).toContain("monopolies");
      expect(copy).toContain("rationed");
      expect(copy).toContain("Veyra Civic Authority");
      expect(copy).toContain("Orison Heavy Industries");
      expect(copy).toContain("Census Mirror Grid");
      expect(copy).toContain("Sector 14 Hab-Blocks");
      expect(copy).toContain("The Common Assembly");
      expect(copy).toContain("Director Sulan Vane");
      expect(copy).toContain("local-first");
      expect(dystopia.cta.title).toBe("Map the Regime. Fuel the Resistance.");
    });

    it("maintains a valid hub-and-spoke dystopian power graph with categorized nodes", () => {
      const dystopia = getLandingPage("dystopian-sci-fi")!;
      const graph = dystopia.exampleGraph!;

      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("faction");
      expect(hub.label).toBe("Veyra Civic Authority");
      expect(hub.sublabel).toContain("Ruling Authority");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Orison Heavy Industries")
          ?.relation,
      ).toBe("Contracts");
      expect(
        graph.steps.find((s) => s.label === "Census Mirror Grid")?.relation,
      ).toBe("Monitors citizens via");
      expect(
        graph.steps.find((s) => s.label === "Sector 14 Hab-Blocks")?.relation,
      ).toBe("Enforces rationing on");
      expect(
        graph.steps.find((s) => s.label === "The Common Assembly")?.relation,
      ).toBe("Suppresses");
      expect(
        graph.steps.find((s) => s.label === "Director Sulan Vane")?.relation,
      ).toBe("Commands");

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("faction");
      expect(categories).toContain("item");
      expect(categories).toContain("location");
      expect(categories).toContain("character");
    });
  });

  describe("Conspiracy Pack", () => {
    it("is registered as genre, uses sharp styling, and omits non-affiliation disclaimer", () => {
      const conspiracy = getLandingPage("conspiracy");
      expect(conspiracy).toBeDefined();
      expect(conspiracy?.slug).toBe("conspiracy");
      expect(conspiracy?.kind).toBe("genre");
      expect(conspiracy?.theme).toBe("modern");
      expect(conspiracy?.hub).toBe("modern");
      expect(conspiracy?.surfaceStyle).toBe("sharp");
      expect(conspiracy?.disclaimer).toBeUndefined();
      expect(conspiracy?.seo.image).toBe(
        "https://assets.codexcryptica.com/og/conspiracy.jpg",
      );
      expect(conspiracy?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(conspiracy?.exampleGraph?.steps.length).toBeGreaterThanOrEqual(5);
    });

    it("uses authentic conspiracy / intrigue terminology and avoids generic fantasy", () => {
      const conspiracy = getLandingPage("conspiracy")!;
      const copy = JSON.stringify(conspiracy);

      // Avoid generic fantasy clichés
      expect(copy).not.toMatch(/questgiver|dungeon crawl|loot table/i);
      expect(copy).not.toMatch(/\bparty of heroes\b/i);

      // Verify authentic conspiracy terminology
      expect(conspiracy.hero.eyebrow).toContain("Conspiracy & Intrigue");
      expect(copy).toContain("operatives");
      expect(copy).toContain("fronts");
      expect(copy).toContain("evidence");
      expect(copy).toContain("hidden relationships");
      expect(copy).toContain("The Meridian Group");
      expect(copy).toContain("Calder Biomedical Holdings");
      expect(copy).toContain("Senator Julian Vance");
      expect(copy).toContain("Project Glasshouse");
      expect(copy).toContain("Northfield Research Annex");
      expect(copy).toContain("local-first");
      expect(conspiracy.cta.title).toBe("Map the Conspiracy");
    });

    it("maintains a valid hub-and-spoke conspiracy graph with categorized nodes", () => {
      const conspiracy = getLandingPage("conspiracy")!;
      const graph = conspiracy.exampleGraph!;

      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("faction");
      expect(hub.label).toBe("The Meridian Group");
      expect(hub.sublabel).toContain("Policy Network");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Calder Biomedical Holdings")
          ?.relation,
      ).toBe("Funds via");
      expect(
        graph.steps.find((s) => s.label === "Senator Julian Vance")?.relation,
      ).toBe("Blackmails");
      expect(
        graph.steps.find((s) => s.label === "Project Glasshouse")?.relation,
      ).toBe("Directs");
      expect(
        graph.steps.find((s) => s.label === "Meeting Recording, 14 March")
          ?.relation,
      ).toBe("Incriminated by");

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("character");
      expect(categories).toContain("faction");
      expect(categories).toContain("location");
      expect(categories).toContain("item");
    });
  });

  describe("Cosmic Horror Pack", () => {
    it("is registered as genre, uses sharp styling, and omits non-affiliation disclaimer", () => {
      const cosmic = getLandingPage("cosmic-horror");
      expect(cosmic).toBeDefined();
      expect(cosmic?.slug).toBe("cosmic-horror");
      expect(cosmic?.kind).toBe("genre");
      expect(cosmic?.theme).toBe("horror");
      expect(cosmic?.hub).toBe("cosmic-horror");
      expect(cosmic?.surfaceStyle).toBe("sharp");
      expect(cosmic?.disclaimer).toBeUndefined();
      expect(cosmic?.seo.image).toBe(
        "https://assets.codexcryptica.com/og/cosmic-horror.jpg",
      );
      expect(cosmic?.seo.imageAlt).toBeDefined();
      expect(cosmic?.useCases.length).toBeGreaterThanOrEqual(4);
      expect(cosmic?.exampleGraph?.steps.length).toBeGreaterThan(0);
    });

    it("uses authentic cosmic horror worldbuilding language without system lock-in", () => {
      const cosmic = getLandingPage("cosmic-horror")!;
      const copy = JSON.stringify(cosmic);

      // Avoid generic fantasy or system-specific rules jargon
      expect(copy).not.toMatch(/questgiver|dungeon crawl|loot table/i);
      expect(copy).not.toMatch(/sanity check|blood bond|primogen/i);
      expect(copy).not.toMatch(/complete local privacy/i);
      expect(copy).not.toMatch(/across every stage of your campaign/i);

      // Verify authentic cosmic horror worldbuilding concepts
      expect(cosmic.hero.eyebrow).toContain("Cosmic Horror");
      expect(copy).toContain("cults");
      expect(copy).toContain("expedition");
      expect(copy).toContain("archives");
      expect(copy).toContain("anomalies");
      expect(copy).toContain("Revelations");
      expect(copy).toContain("Manifestations");
      expect(copy).toContain("The Tethys Institute");
      expect(copy).toContain("local-first");
      expect(cosmic.cta.title).toBe("Build the Mystery. Keep the Connections.");

      const toolTitles = cosmic.recommendedTools.map((t) => t.title);
      expect(toolTitles).toContain("Artifact & Relic Generator");
    });

    it("maintains a valid hub-and-spoke cosmic anomaly graph with categorized nodes", () => {
      const cosmic = getLandingPage("cosmic-horror")!;
      const graph = cosmic.exampleGraph!;

      expect(graph.palette).toBe("oxblood");
      expect(graph.surface).toBe("dark");

      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      expect(hub.category).toBe("faction");
      expect(hub.label).toBe("The Tethys Institute");

      for (const spoke of spokes) {
        expect(spoke.relation).toBeTruthy();
        expect(spoke.category).toBeDefined();
      }

      expect(
        graph.steps.find((s) => s.label === "Dr Corin Ward")?.relation,
      ).toBe("Employs");
      expect(
        graph.steps.find((s) => s.label === "Acoustic Anomaly 7")?.relation,
      ).toBe("Discovers");
      expect(
        graph.steps.find((s) => s.label === "The Drowned Monolith")?.relation,
      ).toBe("Investigates");
      expect(
        graph.steps.find((s) => s.label === "Order of the Black Tide")
          ?.relation,
      ).toBe("Hounded by");

      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("faction");
      expect(categories).toContain("character");
      expect(categories).toContain("event");
      expect(categories).toContain("item");
      expect(categories).toContain("location");
    });
  });

  describe("Example graphs", () => {
    const pagesWithGraphs = getAllLandingPages().filter((p) => p.exampleGraph);

    it("covers every page that ships a graph", () => {
      expect(pagesWithGraphs.length).toBeGreaterThan(0);
    });

    it("gives every node a category so colours come from config, not node text", () => {
      for (const page of pagesWithGraphs) {
        for (const step of page.exampleGraph!.steps) {
          expect(step.category, `${page.slug} / ${step.label}`).toBeDefined();
        }
      }
    });

    it("labels every spoke with its relation to the hub, and leaves the hub unlabelled across all packs", () => {
      for (const page of pagesWithGraphs) {
        const [hub, ...spokes] = page.exampleGraph!.steps;
        expect(
          hub.relation,
          `${page.slug} hub (${hub.label}) should not have a relation`,
        ).toBeUndefined();
        expect(
          spokes.length,
          `${page.slug} should have at least 1 spoke`,
        ).toBeGreaterThan(0);
        for (const spoke of spokes) {
          expect(
            spoke.relation,
            `${page.slug} / ${spoke.label} is missing a spoke relation`,
          ).toBeTruthy();
        }
      }
    });

    it("keeps graph badge copy per-page rather than sharing one horror label", () => {
      const horrorBadges = getAllLandingPages()
        .filter((p) => p.theme === "horror" && p.exampleGraph)
        .map((p) => p.exampleGraph!.badgeLabel);

      expect(horrorBadges.length).toBeGreaterThanOrEqual(3);
      for (const badge of horrorBadges) {
        expect(badge).toBeTruthy();
        expect(badge).not.toMatch(/underworld/i);
      }
      expect(new Set(horrorBadges).size).toBeGreaterThan(1);
    });
  });

  describe("Theme hub linking", () => {
    it("points every landing page at a hub that exists", () => {
      for (const page of getAllLandingPages()) {
        expect(page.hub, `${page.slug} has no hub`).toBeDefined();
        expect(isHubThemeSlug(page.hub!), `${page.slug} -> ${page.hub}`).toBe(
          true,
        );
      }
    });

    it("groups the horror systems under the hub matching their subject", () => {
      expect(getLandingPage("vampire-the-masquerade")?.hub).toBe("vampire");
      expect(getLandingPage("gothic-horror")?.hub).toBe("vampire");
      // Both are theme: "horror", but they belong to different hubs.
      expect(getLandingPage("call-of-cthulhu")?.hub).toBe("cosmic-horror");
      expect(getLandingPage("cosmic-horror")?.hub).toBe("cosmic-horror");
    });

    it("returns the pages belonging to a hub", () => {
      const fantasy = getLandingPagesForHub("fantasy").map((p) => p.slug);
      expect(fantasy).toContain("dungeons-and-dragons");
      expect(fantasy).toContain("pathfinder-2e");
      expect(fantasy).toContain("fantasy-worldbuilding");
      expect(fantasy).not.toContain("call-of-cthulhu");

      const cosmic = getLandingPagesForHub("cosmic-horror").map((p) => p.slug);
      expect(cosmic).toContain("call-of-cthulhu");
      expect(cosmic).toContain("cosmic-horror");
    });

    it("returns nothing for a hub with no landing pages", () => {
      expect(getLandingPagesForHub("steampunk")).toEqual([]);
      expect(getLandingPagesForHub("not-a-hub")).toEqual([]);
    });
  });

  describe("Copy consistency", () => {
    it("uses British spellings", () => {
      const copy = JSON.stringify(getAllLandingPages());
      expect(copy).not.toMatch(/\bOrganiz/i);
      expect(copy).not.toMatch(/\bHarbor\b/);
      expect(copy).not.toMatch(/\bCatalog\b/);
    });
  });

  describe("Vampire: The Masquerade graph", () => {
    const vtm = getLandingPage("vampire-the-masquerade")!;
    const graph = vtm.exampleGraph!;
    const clanOf = (sublabel = "") => sublabel.match(/Kindred • (\w+)/)?.[1];

    it("uses sharp surfaces and reveals the graph on a dark ground", () => {
      expect(vtm.surfaceStyle).toBe("sharp");
      expect(graph.surface).toBe("dark");
      expect(graph.palette).toBe("oxblood");
    });

    it("names the graph without explaining the metaphor", () => {
      const copy = `${graph.title} ${graph.description ?? ""} ${graph.badgeLabel ?? ""}`;
      expect(copy).not.toMatch(/underworld|nocturnal|hidden/i);
      expect(graph.title).toContain("Relationship Web");
    });

    it("labels every spoke with its relation to the hub, and leaves the hub unlabelled", () => {
      // LandingPageGraphPreview draws step[i].relation on the edge from the
      // hub (step 0) to step i, so a relation on the hub itself never renders.
      const [hub, ...spokes] = graph.steps;
      expect(hub.relation).toBeUndefined();
      for (const spoke of spokes) {
        expect(spoke.relation, spoke.label).toBeTruthy();
      }
    });

    it("gives a childe the same clan as their sire", () => {
      const hub = graph.steps[0];
      const childe = graph.steps.find((s) => s.relation === "Sire of");
      expect(childe).toBeDefined();
      expect(clanOf(childe!.sublabel)).toBe(clanOf(hub.sublabel));
      expect(clanOf(hub.sublabel)).toBeTruthy();
    });

    it("only points Kindred-to-Kindred relations at Kindred", () => {
      const kindredOnly = ["Sire of", "Blood Bond to"];
      for (const step of graph.steps) {
        if (step.relation && kindredOnly.includes(step.relation)) {
          expect(step.category, step.label).toBe("character");
          expect(step.sublabel).toContain("Kindred");
        }
      }
    });

    it("only lets people and factions act on other entities", () => {
      // Blackmail, favours and control are things agents do — a domain cannot
      // blackmail anyone, so the hub must be a character or a faction.
      expect(["character", "faction"]).toContain(graph.steps[0].category);
    });

    it("connects Kindred, a domain, a faction and a mortal contact", () => {
      const categories = new Set(graph.steps.map((s) => s.category));
      expect(categories).toContain("character");
      expect(categories).toContain("location");
      expect(categories).toContain("faction");
      expect(graph.steps.some((s) => s.sublabel?.startsWith("Mortal"))).toBe(
        true,
      );
    });
  });

  describe("OpenGraph & Social Share Metadata", () => {
    it("configures a dedicated CDN OpenGraph image and alt description for every landing page", () => {
      const allPages = getAllLandingPages();
      expect(allPages.length).toBeGreaterThanOrEqual(11);

      for (const page of allPages) {
        expect(page.seo.image, `${page.slug} missing seo.image`).toBe(
          `https://assets.codexcryptica.com/og/${page.slug}.jpg`,
        );
        expect(
          page.seo.imageAlt,
          `${page.slug} missing seo.imageAlt`,
        ).toBeDefined();
        expect(
          page.seo.imageAlt!.length,
          `${page.slug} has empty seo.imageAlt`,
        ).toBeGreaterThan(15);
      }
    });
  });

  describe("Extensibility (US3)", () => {
    it("allows dynamic page addition and handles optional section collapsing", () => {
      const customConfig: LandingPageConfig = {
        slug: "custom-system",
        kind: "system",
        seo: { title: "Custom", description: "Custom" },
        hero: {
          title: "Custom Hero",
          tagline: "Tag",
          problemStatement: "Prob",
        },
        useCases: [],
        recommendedTools: [],
        cta: { title: "Start", buttonText: "Go", buttonHref: "/go" },
      };

      const customRegistry = { "custom-system": customConfig };

      const page = getLandingPage("custom-system", customRegistry);
      expect(page).toBeDefined();
      expect(page?.slug).toBe("custom-system");
      expect(page?.exampleGraph).toBeUndefined();
      expect(page?.disclaimer).toBeUndefined();
    });
  });
});
