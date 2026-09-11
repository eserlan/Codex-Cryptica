import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2549, the first of the generator showcase series.
 * Output is reproduced unedited; only the surrounding framing is ours.
 */
export const gullsRoost: ExampleConfigInput = {
  slug: "gulls-roost-coastal-smuggling-town",
  labels: ["fantasy"],
  name: "Gull's Roost",
  title: "Fantasy settlement example: Gull's Roost",
  kind: "settlement",
  genre: "Fantasy",
  theme: "fantasy",
  summary:
    "A salt-caked coastal smuggling town built around a collapsed sea-arch, nominally governed by an elected council of merchants while petty crews run the docks.",
  provenance: "raw",
  generator: { name: "Settlement generator", href: "/generators/settlement" },
  context: [
    { label: "Scale", value: "Town (500–5,000 inhabitants)" },
    { label: "Genre", value: "Fantasy" },
    { label: "Environment", value: "Coastal" },
    { label: "Primary function", value: "Smuggling haven" },
    { label: "Official authority", value: "Elected council" },
    { label: "Tone", value: "Lawless" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/settlement-gulls-roost.jpg",
    alt: "A fog-drowned coastal town of timber warehouses clinging to black limestone stacks above a tidal cove",
  },
  output: [
    {
      kind: "prose",
      heading: "Core concept",
      paragraphs: [
        "Gull's Roost occupies a sheltered, fog-drowned cove where a natural limestone arch once spanned the tidal shelf before collapsing into jagged stacks. This geological maze creates a blind spot in coastal patrols, allowing shallow-draft vessels to slip cargo ashore out of sight of regional tax-galleons. The town grew from a handful of fishing huts into a sprawling wharf-settlement because the same treacherous reefs that wreck honest freighters serve as an open door for illicit trade.",
      ],
    },
    {
      kind: "prose",
      heading: "First impression",
      paragraphs: [
        "The smell of brine, low-grade lamp oil, and curing herring hangs thick in the salty air, mixing with the constant roar of waves crashing against the black limestone stacks. Ramshackle timber warehouses and salt-cured canvas awnings lean haphazardly over narrow, muddy alleys that wind steeply up the cliff face. Every doorframe seems scarred by hooks, and locals eye newcomers with practiced indifference, keeping their hands tucked inside heavy wool coats.",
      ],
    },
    {
      kind: "prose",
      heading: "Inhabitants",
      paragraphs: [
        "Approximately 1,800 permanent residents dwell within the cove, supplemented by a shifting transient population of roughly 400 sailors, riggers, deckhands, and out-of-work mercenaries living in boarding houses or sleeping on their sloops. The demographic is overwhelmingly human, with a smaller populace of stout coastal dwarves operating the salt-pans and a smattering of web-fingered riverfolk working the net-lofts. The workforce is divided between legitimate harbor-folk (net-weavers, coopers, fish-salters, and sailmakers) and the shadow-labor of cargo-haulers, night-watchmen, and weighers who service the clandestine trade.",
      ],
    },
    {
      kind: "list",
      heading: "Life here",
      items: [
        {
          text: "Livelihoods depend entirely on the tide: when the water drops, the entire population rushes to haul crates through the sea-caves before the rising surf blocks the tunnels.",
        },
        {
          text: "A local custom involves tossing a silver dram into the froth at the base of the central collapsed arch before launching any new vessel, ensuring safe passage through the reefs.",
        },
        {
          text: "The most common complaint among residents is the abysmal quality of the imported well water, which tastes faintly of sulfur and brackish mud.",
        },
        {
          text: "Locals frequently debate whether the upcoming seasonal gales will collapse the eastern boardwalk entirely, cutting off access to the fish-drying racks.",
        },
        {
          text: "Outsiders often assume every citizen is a hardened criminal, entirely missing the thriving, mundane domestic life of bakeries, children playing tag on the salt-flats, and neighborhood scot-and-lot clubs.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "History",
      paragraphs: [
        "Gull's Roost began two centuries ago as a wretched seasonal camp for outcast fishers who refused to pay tithes to the mainland barons. When a major maritime empire attempted to blockade the region to enforce grain monopolies, local skippers successfully guided contraband food fleets through the collapsing sea-arch, turning a nest of outlaws into an essential lifeline. The crown eventually granted the settlement municipal status as a compromise to keep the port semi-functional, leading to the formation of the Harbour Council.",
      ],
    },
    {
      kind: "prose",
      heading: "Current tension",
      paragraphs: [
        "The fragile truce between the two dominant dock syndicates has fractured following the hijacking of a heavily laden spice-ketch, pushing the town to the brink of open turf warfare along the piers. Armed rowdies patrol the alleyways after dusk, shaking down independent merchants and forcing the elected council into hiding. This escalation threatens to draw the attention of the royal navy if the violence spills beyond the harbor walls.",
      ],
    },
    {
      kind: "list",
      heading: "Points of interest",
      items: [
        {
          term: "The High House",
          text: "A modest timber hall perched on the cliff edge where the elected council holds contentious public assemblies.",
        },
        {
          term: "The Salt-Stained Ledger",
          text: "A bustling tavern and weigh-station where legitimate fish-mongers and smugglers alike haggle over the price of dried cod and contraband salt.",
        },
        {
          term: "Mother Orelia's Parlor",
          text: "A warm, peat-smoked bathhouse and herbalist shop serving as the neutral social heart of the community.",
        },
        {
          term: "The Lantern Spire",
          text: "A whitewashed lighthouse and shrine to the tides, maintained by silent hermits who care for the town's maritime dead.",
        },
        {
          term: "The Jaw-Arch",
          text: "A forbidden underwater sea-cave beneath the docks where uninspected cargo rests on submerged racks before distribution.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Notable inhabitants",
      items: [
        {
          term: "Bramley Vance (Council Magistrate)",
          text: "A weary, salt-bitten official trying desperately to maintain procedural law while dodging threats from both feuding syndicates.",
        },
        {
          term: "Tressa Miller (Net-Weaver and Shopkeeper)",
          text: "A sharp-tongued elderly artisan whose shop overlooks the central slipway and who knows the family history of every soul in the cove.",
        },
        {
          term: "Kester Corbet (Tavern Keeper)",
          text: "A jovial, one-armed host who keeps the peace inside his taproom by refusing service to anyone carrying a drawn blade.",
        },
        {
          term: "Joryn Hayes (Midwife and Herbalist)",
          text: "A brisk, practical healer who tends to dockside injuries and stubbornly refuses to pick sides in the current gang violence.",
        },
        {
          term: "Old Fritjof (Mendicant Beachcomber)",
          text: "An eccentric local sage who spends his days carving scrimshaw whalebones and muttering cryptic warnings about the upcoming winter tides.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Controlling and important factions",
      items: [
        {
          term: "The Salt-Pan Guild",
          text: "An economic cooperative of brine-boilers and coopers who control the town's primary legal export and guard their boilers fiercely.",
        },
        {
          term: "The Saltwater Watch",
          text: "A political faction composed of traditionalist councilors advocating for absolute municipal independence from mainland taxation.",
        },
        {
          term: "The Tide-Singers",
          text: "A cultural-religious group of shore-priests who maintain the shrines and arbitrate customary maritime disputes using ancient sea-law.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Adventure hooks",
      items: [
        {
          text: "An innocent cargo-handler has been caught in the crossfire of the syndicate war and locked in a disputed warehouse; someone needs to extract him before his rivals find him.",
        },
        {
          text: "A sudden contamination of the coastal wells has caused a severe water shortage just as a heavy storm traps everyone inside the cove.",
        },
        {
          text: "Rumors spread among the beachcombers that an old wreck wedged in the deeper reef has shifted during the recent gale, exposing a long-lost cargo hold.",
        },
      ],
    },
  ],
  annotation: {
    heading: "What makes this usable at the table",
    paragraphs: [
      "The geography carries the economy. The collapsed arch is not scenery — it is the reason smuggling works here, the reason the town outgrew its fishing huts, and the reason the reefs that wreck honest freighters are an asset rather than a hazard. A settlement whose reason to exist is that concrete answers most questions a party will ask before they are asked.",
      "Note how much of the detail is ordinary. Bakeries, children on the salt-flats, an argument about well water that tastes of sulfur, a boardwalk that may not survive the gales. A smuggling town written as nothing but crime is a set; this one is a place where crime happens, which is what makes the crime land.",
      "The current tension is scoped as one active situation rather than the town's whole identity. The syndicate war is escalating, the council is in hiding, and the royal navy is the clock — but the salt-pans still run and the midwife still refuses to take sides. That separation is what lets you drop the town into a campaign without the tension dictating every scene.",
    ],
  },
  relatedGenerators: [
    {
      title: "Settlement generator",
      description:
        "Roll your own town, district or outpost across any genre. Free, no login.",
      href: "/generators/settlement",
    },
    {
      title: "Tavern generator",
      description:
        "Take a single location deeper — owner, patrons, rumours and trouble.",
      href: "/generators/tavern",
    },
  ],
  relatedAnswers: [
    {
      title: "What should an RPG settlement contain?",
      description:
        "The framework behind this output: a reason to exist, enterable places, people who want things, one unsolved problem.",
      href: "/answers/what-should-an-rpg-settlement-contain",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "How settlements, factions and history stay connected across a campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedExamples: [
    "the-low-tide-rust-dock-syndicate",
    "arc-hub-augmentation-slum",
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2549",
  seo: {
    title: "Fantasy settlement example: Gull's Roost | Codex Cryptica",
    description:
      "Unedited settlement generator output — a coastal smuggling town with a working economy, five points of interest, named residents and live adventure hooks.",
  },
};
