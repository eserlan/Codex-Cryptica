import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SILHOUETTES,
  SILHOUETTE_MAP,
  SILHOUETTE_ASSET_BASE,
  SILHOUETTE_ASSET_VERSION,
  SilhouetteDefinitionSchema,
  clearSilhouetteCache,
  getSilhouetteUrl,
  loadSilhouetteDataUri,
  loadSilhouetteSvg,
  resolveEntitySilhouette,
  svgToDataUri,
  tintSilhouetteSvg,
} from "./silhouettes";

describe("Silhouette Registry & Schema", () => {
  it("validates all registered silhouettes against SilhouetteDefinitionSchema", () => {
    expect(SILHOUETTES.length).toBeGreaterThanOrEqual(20);

    for (const silhouette of SILHOUETTES) {
      const result = SilhouetteDefinitionSchema.safeParse(silhouette);
      expect(result.success, `Invalid silhouette: ${silhouette.id}`).toBe(true);
      expect(silhouette.r2Path).toMatch(/^silhouettes\/[a-z0-9-_/]+\.svg$/);
      // The artwork is fetched from R2, never inlined: a definition carrying
      // markup would put megabytes back into every bundle that imports schema.
      expect(silhouette).not.toHaveProperty("svgContent");
    }
  });

  it("ensures all silhouette IDs are unique", () => {
    const ids = SILHOUETTES.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("indexes all silhouettes in SILHOUETTE_MAP", () => {
    expect(SILHOUETTE_MAP.size).toBe(SILHOUETTES.length);
    for (const s of SILHOUETTES) {
      expect(SILHOUETTE_MAP.get(s.id)).toBe(s);
    }
  });
});

describe("Silhouette artwork loading", () => {
  const definition = { r2Path: "silhouettes/item/fantasy/relic-blade.svg" };
  const markup =
    '<svg width="512" height="512" viewBox="0 0 512 512"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';
  const ok = () =>
    vi.fn(async () => new Response(markup, { status: 200 })) as any;

  beforeEach(() => {
    clearSilhouetteCache();
  });

  it("addresses artwork by its R2 key, stamped with the cache generation", () => {
    // The stamp is what keeps a cached, CORS-less copy of the bare URL from
    // blanking the glyph — see SILHOUETTE_ASSET_VERSION.
    expect(getSilhouetteUrl(definition)).toBe(
      `${SILHOUETTE_ASSET_BASE}silhouettes/item/fantasy/relic-blade.svg?v=${SILHOUETTE_ASSET_VERSION}`,
    );
  });

  it("offers the bare address for sharing", () => {
    expect(getSilhouetteUrl(definition, undefined, { bare: true })).toBe(
      `${SILHOUETTE_ASSET_BASE}silhouettes/item/fantasy/relic-blade.svg`,
    );
  });

  it("tints through currentColor, which an SVG loaded as an image cannot inherit", () => {
    expect(tintSilhouetteSvg(markup, "#5e3018")).toContain('fill="#5e3018"');
    expect(tintSilhouetteSvg(markup, "#5e3018")).not.toContain("currentColor");
  });

  it("fetches artwork once and shares it with every later caller", async () => {
    const fetchImpl = ok();

    const [first, second] = await Promise.all([
      loadSilhouetteSvg(definition, { fetch: fetchImpl }),
      loadSilhouetteSvg(definition, { fetch: fetchImpl }),
    ]);
    const third = await loadSilhouetteSvg(definition, { fetch: fetchImpl });

    expect(first).toBe(markup);
    expect(second).toBe(markup);
    expect(third).toBe(markup);
    // A graph full of nodes and a picker full of tiles share one request.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns a tinted data URI ready for a canvas background", async () => {
    const uri = await loadSilhouetteDataUri(definition, "#5e3018", {
      fetch: ok(),
    });

    expect(uri).toBe(svgToDataUri(tintSilhouetteSvg(markup, "#5e3018")));
  });

  it("returns null when the artwork cannot be reached, and retries later", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as any;

    expect(await loadSilhouetteSvg(definition, { fetch: offline })).toBeNull();
    expect(
      await loadSilhouetteDataUri(definition, "#5e3018", { fetch: offline }),
    ).toBeNull();

    // The failure is not cached, so coming back online resolves it.
    const recovered = await loadSilhouetteSvg(definition, { fetch: ok() });
    expect(recovered).toBe(markup);
  });

  it("treats a non-200 as unreachable rather than as artwork", async () => {
    const missing = vi.fn(
      async () => new Response("nope", { status: 404 }),
    ) as any;

    expect(await loadSilhouetteSvg(definition, { fetch: missing })).toBeNull();
  });
});

describe("resolveEntitySilhouette Heuristic Inference", () => {
  it("honors explicit entity.silhouette override immediately", () => {
    const match = resolveEntitySilhouette({
      title: "Random Knight",
      silhouette: "cyberpunk-hacker-female",
    });
    expect(match.id).toBe("cyberpunk-hacker-female");
  });

  it("resolves female gothic vampire from title and labels", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Carmilla, Countess of Karnstein",
        labels: ["vampire", "noble", "undead"],
        content: "A blood-drinking aristocratic countess of the old world.",
      },
      { worldTheme: "gothic" },
    );
    expect(match.id).toBe("gothic-vampire-female");
  });

  it("resolves male fantasy warrior from labels and sword keywords", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Sir Gareth the Bold",
        labels: ["knight", "fighter"],
        kind: "NPC",
        content:
          "A veteran warrior clad in full plate armor wielding a broadsword.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("fantasy-warrior-male");
  });

  it("resolves alien scientist in a sci-fi world context", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Overseer Xylar",
        labels: ["alien", "researcher", "scholar"],
        kind: "Specialist",
        content:
          "Conducting biological analysis in the extraterrestrial laboratory.",
      },
      { worldTheme: "scifi" },
    );
    expect(match.id).toBe("scifi-scientist-alien");
  });

  it("resolves western gunslinger for outlaw in western theme", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Silas Vance",
        labels: ["outlaw", "gunslinger", "drifter"],
        content: "A feared bounty hunter with a quick draw revolver.",
      },
      { worldTheme: "western" },
    );
    expect(match.id).toBe("western-gunslinger-male");
  });

  it("resolves dire beast for creature entity", () => {
    const match = resolveEntitySilhouette(
      {
        type: "creature",
        title: "Shadow Worg",
        labels: ["beast", "hound", "feral"],
        content:
          "A large quadruped predator with glowing red eyes and lethal fangs.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("creature-beast-quadruped");
  });

  it("resolves eldritch aberration for cosmic horror creature", () => {
    const match = resolveEntitySilhouette(
      {
        type: "creature",
        title: "Lurker from the Deep",
        labels: ["eldritch", "horror", "tentacles"],
        content:
          "An ancient monstrosity rising from the void with writhing limbs.",
      },
      { worldTheme: "cosmic-horror" },
    );
    expect(match.id).toBe("creature-horror-aberrant");
  });

  it("resolves fortress / citadel for location entities", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Ironhold Fortress",
        labels: ["castle", "keep", "stronghold"],
        content: "An impenetrable stone citadel commanding the mountain pass.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-citadel-castle");
  });

  it("resolves fantasy village for rural hamlet location", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Oakhaven Village",
        labels: ["hamlet", "cottage", "settlement"],
        content:
          "A quiet farming community with thatched roof huts and a water mill.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-fantasy-village");
  });

  it("resolves fantasy town for fortified walled settlement", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Highgate Borough",
        labels: ["town", "city", "walled-town"],
        content:
          "A busy market town protected by stone battlements and towers.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-fantasy-town");
  });

  it("resolves inn & tavern for taverns and pubs", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Drunken Griffin Tavern",
        labels: ["inn", "pub", "alehouse"],
        content: "A warm roadside inn serving spiced mead by the hearth.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-inn-tavern");
  });

  it("resolves wizard tower for arcane spires", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Spire of Celestial Spheres",
        labels: ["tower", "observatory", "arcane-spire"],
        content:
          "A twisting stone tower surrounded by levitating astral rings.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-wizard-tower");
  });

  it("resolves dungeon & crypt for subterranean catacombs", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Sunken Catacombs",
        labels: ["dungeon", "crypt", "catacomb", "tomb"],
        content:
          "Dark stone corridors littered with bones beneath the ruined chapel.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-dungeon-crypt");
  });

  it("resolves port & harbor for coastal docks", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Kraken Cove Marina",
        labels: ["port", "harbor", "dock", "pier"],
        content:
          "A salty harbor packed with merchant galleons and fishing boats.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-port-harbor");
  });

  it("resolves temple & shrine for sacred sanctuaries", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Grand Solarium Shrine",
        labels: ["temple", "shrine", "sanctuary"],
        content: "A radiant marble temple dedicated to the Solar Archons.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-temple-shrine");
  });

  it("resolves faction heraldry for faction entities", () => {
    const match = resolveEntitySilhouette(
      {
        type: "faction",
        title: "The Golden Crest Guild",
        labels: ["guild", "nobility", "empire"],
        content:
          "An ancient alliance bearing the imperial banner and royal crest.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("faction-insignia-crest");
  });

  it("falls back to generic silhouette when no specific metadata matches", () => {
    const match = resolveEntitySilhouette({
      title: "Unknown Entity",
    });
    expect(match.archetype).toBe("generic");
  });
});

describe("Iconic Fantasy NPC Silhouette Resolution", () => {
  it("resolves innkeeper / barkeep for tavern hosts", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Barnaby the Barkeep",
        labels: ["innkeeper", "tavern"],
        content: "Pouring ale for travelers by the hearth.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-innkeeper");
  });

  it("resolves tavern server / barmaid for tavern servers", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Marta the Barmaid",
        labels: ["server", "waitress", "female"],
        content: "Carrying flagons and serving mead across the pub.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-barmaid");
  });

  it("resolves wandering bard / minstrel for musicians", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Lyra Stringsong",
        labels: ["bard", "minstrel", "musician"],
        content: "Playing a lute at the tavern.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-bard");
  });

  it("resolves noble lord / magistrate for male aristocrats", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Lord Chancellor Vane",
        labels: ["noble", "magistrate", "male"],
        content: "Issuing decrees from the grand manor.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-noble-male");
  });

  it("resolves noble lady / aristocrat for female nobles", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Lady Genevieve",
        labels: ["noble", "aristocrat", "female"],
        content: "An influential duchess holding court in high society.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-noble-female");
  });

  it("resolves town guard / sentry for watchmen", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "City Watch Sentry",
        labels: ["guard", "watchman", "sentry"],
        content: "Patrolling the battlements with a halberd.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-guard");
  });

  it("resolves blacksmith / armorer for forge metalworkers", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Thorin Smith",
        labels: ["blacksmith", "armorer", "male"],
        content: "Hammering red-hot iron on the anvil at the forge.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-blacksmith");
  });

  it("resolves traveling merchant / trader for caravan peddlers", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Garrick Trader",
        labels: ["merchant", "peddler", "caravan"],
        content: "A traveling vendor selling foreign wares and curiosities.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-merchant");
  });

  it("resolves alchemist / apothecary for potionmakers", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Apothecary Helga",
        labels: ["alchemist", "apothecary", "herbalist"],
        content: "Brewing healing potions and remedies in glass vials.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-alchemist");
  });

  it("resolves village priest / friar for holy clergy", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Father Francis",
        labels: ["priest", "friar", "monk", "male"],
        content: "Offering holy blessings in the village chapel.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-priest");
  });

  it("resolves scholar / scribe for librarians and chroniclers", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Scribe Aldous",
        labels: ["scholar", "scribe", "librarian"],
        content: "Cataloging ancient manuscripts and chronicles.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-scholar");
  });

  it("resolves peasant farmer for rural commoners", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Old Farmer Giles",
        labels: ["farmer", "peasant", "villager"],
        content: "Harvesting wheat with a pitchfork in the fields.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-farmer");
  });

  it("resolves street urchin / pickpocket for scamps and beggars", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Pip the Urchin",
        labels: ["urchin", "pickpocket", "thief"],
        content: "A street beggar and clever pickpocket in the alleys.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-urchin");
  });

  it("resolves village elder / matriarch for community leaders", () => {
    const match = resolveEntitySilhouette(
      {
        type: "character",
        title: "Village Matriarch Elspeth",
        labels: ["elder", "matriarch", "ancestor"],
        content: "The respected elder guiding the town council.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("character-npc-elder");
  });
});

describe("Iconic Fantasy Location Silhouette Resolution", () => {
  it("resolves market square / bazaar for trading plazas", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Grand Bazaar Plaza",
        labels: ["market", "stalls", "commerce"],
        content: "Vibrant trade district with merchants and open-air booths.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-market-square");
  });

  it("resolves blacksmith forge & armory for smithies", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Ironhearth Smithy",
        labels: ["blacksmith", "armory", "smithy"],
        content:
          "A roaring forge where weaponsmiths hammer weapons on an anvil.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-blacksmith-forge");
  });

  it("resolves city gate & portcullis for fortified entrances", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Iron Gatehouse",
        labels: ["gate", "city-gate", "portcullis"],
        content:
          "The fortified entrance gate with a heavy iron portcullis and ramparts.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-city-gate");
  });

  it("resolves guardhouse & jail for constabularies and cells", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Town Constabulary",
        labels: ["guardhouse", "jail", "prison"],
        content: "Stone barracks and dungeon cells holding prisoners.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-guardhouse-jail");
  });

  it("resolves town hall / guildhall for civic council buildings", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Civic Council Guildhall",
        labels: ["townhall", "guildhall", "civic"],
        content: "Grand assembly building where the town council holds court.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-town-hall");
  });

  it("resolves thieves alley / slums for underworld tenements", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Shadow Cut Alley",
        labels: ["alley", "slums", "thieves"],
        content: "A dangerous backstreet alley in the underworld shanties.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-slums-alley");
  });

  it("resolves stone river bridge for river crossings", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Old River Causeway",
        labels: ["bridge", "river", "stone-bridge"],
        content:
          "A stone-bridge crossing the rushing waterway with a tollhouse.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-river-bridge");
  });

  it("resolves windmill & granary for grain mills and rural silos", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Highlands Granary",
        labels: ["windmill", "mill", "granary"],
        content:
          "A rustic flour-mill and granary silo surrounded by wheat farms.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-windmill");
  });

  it("resolves apothecary & herb shop for potion dispensaries", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Mandrake Apothecary",
        labels: ["apothecary", "alchemist-shop", "potions"],
        content: "A fragrant herb shop selling healing potions and tinctures.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-apothecary-shop");
  });

  it("resolves noble manor & estate for aristocratic villas", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Vanderbilt Manor Estate",
        labels: ["manor", "estate", "villa"],
        content:
          "An opulent aristocratic mansion with courtyards and manicured grounds.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-noble-manor");
  });

  it("resolves arena & fighting pit for gladiatorial colosseums", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Bloodsand Colosseum",
        labels: ["arena", "colosseum", "fighting-pit"],
        content:
          "A massive fighting arena where gladiators duel before roaring stands.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-fighting-arena");
  });

  it("resolves grand archives & library for book scriptoriums", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Great Athenaeum Archives",
        labels: ["library", "archives", "scriptorium"],
        content:
          "Ancient repository preserving thousands of magical tomes and scrolls.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-grand-library");
  });

  it("resolves bathhouse & thermal springs for thermal baths", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Imperial Thermae Baths",
        labels: ["bathhouse", "baths", "thermae"],
        content:
          "Natural thermal hot-springs and mineral steam baths for relaxation.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-bathhouse");
  });

  it("resolves city sewers & undercity for subterranean drainage canals", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Under-City Sluiceway",
        labels: ["sewers", "undercity", "subterranean"],
        content:
          "Dark subterranean drainage tunnels and sewer canals beneath the streets.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-city-sewers");
  });

  it("resolves waterfront docks for piers and harbor fisheries", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Saltwind Wharf & Pier",
        labels: ["docks", "pier", "wharf"],
        content:
          "Bustling waterfront docks and boardwalk filled with fisheries and ships.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-waterfront-docks");
  });

  it("resolves churchyard & parish chapel for sanctuary chapels", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "St. Jude Parish Churchyard",
        labels: ["churchyard", "chapel", "parish"],
        content:
          "A quiet countryside parish chapel surrounded by ancient graves.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-churchyard-cemetery");
  });

  it("resolves ancient ruins & fortress for fallen monoliths", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Fallen Monolith Ruins",
        labels: ["ruins", "ancient-ruins", "fallen-kingdom"],
        content:
          "Crumbled stone pillars and walls of a forgotten ancient fortress.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-ancient-ruins");
  });

  it("resolves enchanted forest for sylvan woodland groves", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Whispering Canopy Woods",
        labels: ["forest", "woods", "enchanted-forest"],
        content:
          "A sylvan woodland grove with giant trees and luminous mushrooms.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-enchanted-forest");
  });

  it("resolves subterranean cavern & cave for deep grottos", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Echoing Deep Grotto",
        labels: ["cavern", "cave", "grotto"],
        content:
          "A subterranean cave with hanging stalactites over an underground chasm.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-cavern-cave");
  });

  it("resolves mountain peak & eyrie for high summit crags", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Stormpeak Summit",
        labels: ["mountain", "peak", "cliffs"],
        content:
          "A jagged mountain summit with sheer precipice cliffs and an eagle eyrie.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-mountain-peak");
  });

  it("resolves murky swamp & bog for wetland mires", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Rotwater Quagmire",
        labels: ["swamp", "bog", "marsh"],
        content: "A murky mangrove mire and wetland bog shrouded in foul mist.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-swamp-bog");
  });

  it("resolves mage academy & observatory for arcane astronomical spires", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Astral Spires Observatory",
        labels: ["academy", "university", "observatory"],
        content:
          "Arcane academy with celestial spires and astronomical telescopes.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-mage-academy");
  });

  it("resolves haunted graveyard & necropolis for dark crypts and mausoleums", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "The Silent Necropolis",
        labels: ["graveyard", "necropolis", "mausoleum"],
        content:
          "A haunted cemetery filled with crypts, tombs, and crumbling headstones.",
      },
      { worldTheme: "gothic" },
    );
    expect(match.id).toBe("location-graveyard-necropolis");
  });

  it("resolves desert oasis & ruins for desert dune springs", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Mirage Springs Oasis",
        labels: ["oasis", "desert", "dunes"],
        content:
          "A lush freshwater pool with palms nestled among towering desert sand dunes.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-desert-oasis");
  });

  it("resolves volcanic caldera & forge for active craters and lava", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Mount Brimstone Caldera",
        labels: ["volcano", "caldera", "lava"],
        content:
          "An active volcanic crater bubbling with infernal magma and basalt chasms.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-volcano-caldera");
  });

  it("resolves frontier outpost & fort for border stockades and palisades", () => {
    const match = resolveEntitySilhouette(
      {
        type: "location",
        title: "Fort Redstone Outpost",
        labels: ["outpost", "fort", "palisade"],
        content:
          "A wooden palisade stockade and watchtower guarding the border frontier.",
      },
      { worldTheme: "fantasy" },
    );
    expect(match.id).toBe("location-frontier-outpost");
  });
});
