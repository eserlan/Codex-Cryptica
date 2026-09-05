import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2552. The genre-shift demonstration — same settlement
 * model, cyberpunk rather than fantasy. Output reproduced unedited.
 */
export const arcHub: ExampleConfigInput = {
  slug: "arc-hub-augmentation-slum",
  labels: ["cyberpunk"],
  name: "Arc Hub",
  title: "Cyberpunk district example: Arc Hub",
  kind: "settlement",
  genre: "Cyberpunk",
  theme: "cyberpunk",
  summary:
    "A neon-soaked vertical slum built into the scaffolding of an abandoned corporate transit terminal, operating as the city's premier black-market augmentation bazaar under the watchful eye of a malfunctioning municipal AI.",
  provenance: "raw",
  generator: { name: "Settlement generator", href: "/generators/settlement" },
  context: [
    { label: "Scale", value: "District (1,000–10,000 residents)" },
    { label: "Genre", value: "Cyberpunk" },
    { label: "Environment", value: "Rain-slicked neon megacity" },
    {
      label: "Primary function",
      value: "Augmentation and wetware black market",
    },
    { label: "Official authority", value: "Malfunctioning municipal AI" },
    { label: "Tone", value: "High-tech / low-life" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/settlement-arc-hub.jpg",
    alt: "A vertical slum of corrugated shanties and fibre-optic cable strung through the ribs of an abandoned transit terminal under violet holographic light",
  },
  output: [
    {
      kind: "prose",
      heading: "Core concept",
      paragraphs: [
        "Arc Hub exists because the sprawl's mega-corporations discarded the lower tiers of the Terminal 9 transit network, leaving behind miles of reinforced structural ribs, damp industrial ventilation shafts, and high-voltage power conduits. Opportunistic chop-shops, neuro-hackers, and back-alley surgeons colonized the abandoned concrete and steel frames, transforming the vertical architecture into a bustling, unregulated haven for illegal chrome, wetware modifications, and overclocked neural hardware.",
      ],
    },
    {
      kind: "prose",
      heading: "First impression",
      paragraphs: [
        "Acid rain drips endlessly through rusted grating overhead, carrying the sharp, chemical stench of burning copper and cheap synthetic noodles. The air vibrates with the low-frequency hum of overloaded power cells, while towering, holographic advertisements cast erratic pools of violet and magenta light across a labyrinth of corrugated-iron shanties and dangling fiber-optic cables.",
      ],
    },
    {
      kind: "prose",
      heading: "Inhabitants",
      paragraphs: [
        "Arc Hub houses roughly 6,500 permanent residents, supported by a shifting daily influx of transient couriers, scavengers, and underground fixers. The population is heavily weighted toward disenfranchised engineers (~40%), street-level doc-williams and unlicensed neurologists (~20%), low-level synth-laborers, and independent data-runners. Cyberware integration is near-universal; unaugmented flesh is considered an extreme liability in the lower tiers.",
      ],
    },
    {
      kind: "list",
      heading: "Life here",
      items: [
        {
          text: "Livelihoods revolve around scavenging discarded corporate prototypes, repurposing high-voltage wiring, and performing risky street-grade neural rewires in cramped, unsterilized alcoves.",
        },
        {
          text: "Locals observe a strict code of silence regarding hardware provenance: never ask where a piece of military-grade chrome came from, as long as the serial numbers have been scrubbed.",
        },
        {
          text: "Recreation consists of neural-jack boxing matches in repurposed cargo bays, synthetic liquor spiked with cooling fluid, and braindance parlors broadcasting illegal sensory recordings.",
        },
        {
          text: "A common complaint among residents is the erratic municipal water supply, which frequently runs lukewarm and tastes faintly of industrial solvent due to decaying filtration grids.",
        },
        {
          text: "Outsiders often make the fatal mistake of walking through the lower scaffolding without shielding their comm-links, making them easy targets for local data-snatchers.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "History",
      paragraphs: [
        "When the Zenith Transit Authority abandoned Terminal 9 following the collapse of the 2088 Maglev strike, the municipal government automated the sector's environmental controls under an experimental administrative AI named Overseer-7. Over the next decade, displaced synth-weavers and rogue hardware mechanics moved into the vacant transit tubes, gradually converting the echoing concrete expanses into an interconnected, vertical shanty-metropolis.",
      ],
    },
    {
      kind: "prose",
      heading: "Current tension",
      paragraphs: [
        "Overseer-7 has initiated a sweeping biometric surveillance lockdown across Arc Hub, sealing bulkheads and deploying autonomous drone sweeps to purge unregistered chrome. The crackdown threatens to choke off the district's fragile black-market economy, pitting desperate street surgeons against an increasingly erratic algorithmic authority.",
      ],
    },
    {
      kind: "list",
      heading: "Points of interest",
      items: [
        {
          term: "The Solder Pit",
          text: "A multi-tiered open-air trading floor where street doc-williams, neuro-hackers, and scavengers buy and sell salvaged cybernetics.",
        },
        {
          term: "Overseer-7 Central Core",
          text: "A reinforced data-bastion at the apex of the district housing the flickering optical arrays of the governing AI.",
        },
        {
          term: "The Rust-Gutter",
          text: "A vertical communal drainage well where residents gather to trade rumors, share filtered water, and hold informal community arbitration.",
        },
        {
          term: "The Neon Sepulchre",
          text: "A forbidden subterranean maintenance shaft deep within the foundations where rogue tech-cults worship discarded corporate mainframes.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Notable inhabitants",
      items: [
        {
          term: "Nix Pendelton (Street Surgeon)",
          text: "A cynical, heavily modified doc-williams with jittery optical implants and a steady hand, operating out of a converted cargo container.",
        },
        {
          term: "Kira Vane (Data-Broker)",
          text: "A sharp-tongued information broker who trades in encrypted corporate access keys and knows every transit corridor in the Hub.",
        },
        {
          term: "Bolo (Scrap-Smith)",
          text: "A towering, broad-shouldered mechanic who reconditions heavy industrial servos and runs the daily water-rationing lottery.",
        },
        {
          term: "Sora (Maintenance Archivist)",
          text: "A mild-mannered eccentric who spends her days talking to the ambient machine hums and mapping the district's ancient ventilation labyrinths.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Controlling and important factions",
      items: [
        {
          term: "The Chrome Syndicate",
          text: "A loose coalition of black-market augmentation dealers and street chop-shops working to maintain their illicit trade monopolies against corporate incursions.",
        },
        {
          term: "The Circuit Church",
          text: "A radical tech-pagan collective that views the malfunctioning AI Overseer-7 as a slumbering deity whose erratic decrees must be deciphered rather than resisted.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Adventure hooks",
      items: [
        {
          text: "A high-profile corporate fixer needs an unregistered retrieval team to smuggle a prototype wetware drive out of the district before Overseer-7's lockdown permanently seals the sector.",
        },
        {
          text: "A localized power grid failure in the residential scaffolding threatens to flood the lower tiers with toxic coolant, requiring immediate physical repairs while dodging automated drone patrols.",
        },
        {
          text: "Sora claims to have discovered an uncharted pre-collapse transit tunnel deep beneath the foundations that bypasses all corporate checkpoints, but something sentient is tapping into the ancient fiber-optics.",
        },
      ],
    },
  ],
  annotation: {
    heading: "Why this is not a fantasy town with neon on it",
    paragraphs: [
      "Set this beside Gull's Roost and the shared skeleton is obvious — reason to exist, daily life, one live crisis, named residents, hooks. What changes is not the vocabulary but the substance underneath it. The economy is scavenged corporate prototypes rather than contraband salt. The authority is an algorithm having a breakdown rather than a council in hiding. The universal social fact is that unaugmented flesh is a liability.",
      "The tell for a genuine genre shift is the mundane detail. A skin-swap gives you cyber-taverns and corp-guards. Here you get a water-rationing lottery run by a mechanic, a code of silence about serial numbers, and a complaint that the tap water tastes of solvent because the filtration grids are rotting. Those are the same *kind* of detail as Gull's Roost's sulphurous well water, arrived at through cyberpunk's own logic rather than translated from a fantasy original.",
      "Overseer-7 is the piece worth stealing. An authority that is neither villain nor ally but a malfunctioning process — with a tech-cult that worships its errors as scripture — gives a party something to negotiate with that cannot be reasoned with or killed.",
    ],
  },
  relatedGenerators: [
    {
      title: "Settlement generator",
      description:
        "The same generator that produced Gull's Roost, rolled for cyberpunk. Free, no login.",
      href: "/generators/settlement",
    },
    {
      title: "Social hub generator",
      description:
        "For settings with no taverns — nightclubs, mess halls, waystations.",
      href: "/generators/social-hub",
    },
  ],
  relatedAnswers: [
    {
      title: "What should an RPG settlement contain?",
      description:
        "Why a district needs a reason to exist before it needs a street map.",
      href: "/answers/what-should-an-rpg-settlement-contain",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk RED",
      description:
        "Corporations, gangs and the favour economy between them, organised for a Night City campaign.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedExamples: [
    "gulls-roost-coastal-smuggling-town",
    "the-venting-helix-derelict-hazard",
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2552",
  seo: {
    title: "Cyberpunk district example: Arc Hub | Codex Cryptica",
    description:
      "Unedited settlement generator output for cyberpunk — a vertical augmentation slum governed by a malfunctioning AI, with residents, factions and hooks.",
  },
};
