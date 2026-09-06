import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2790. A Space Western score showcasing the Heist Generator
 * with concentric security rings, rising alarms, a volatile prize, and a compromised
 * getaway tied to Last Light Outpost and The Cinder Wren. Output reproduced verbatim.
 */
export const theBreakwaterVault: ExampleConfigInput = {
  slug: "the-breakwater-vault-space-western-heist",
  labels: ["space-western"],
  name: "The Breakwater Vault",
  title: "Space Western heist example: The Breakwater Vault",
  kind: "heist",
  genre: "Space Western",
  theme: "western",
  summary:
    "An impounded mineral assay vault perched on the outer gantry spine of Last Light Outpost, holding seized pitch-cobalt specie behind pneumatic vacuum seals, shifting patrol shifts, and a compromised getaway.",
  provenance: "raw",
  generator: { name: "Heist generator", href: "/generators/heist" },
  context: [
    { label: "Theme", value: "Space Western" },
    { label: "Heist Type", value: "Theft" },
    { label: "Target Type", value: "Frontier Assay Vault" },
    { label: "Target Scale", value: "Major" },
    { label: "Prize", value: "Seized pitch-cobalt specie & assay bonds" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/heist-the-breakwater-vault.jpg",
    alt: "A battered frontier outpost and gantry vault perched above an asteroid belt beneath a ringed planet",
  },
  output: [
    {
      kind: "list",
      heading: "GM Quick Reference",
      items: [
        {
          term: "Objective",
          text: "Theft — one night to breach the Breakwater Vault and lift the seized pitch-cobalt specie before the consortium transport docks.",
        },
        {
          term: "Primary obstacle",
          text: "Three concentric rings — outer crane gantries with sweeping sodium lights, the customs clerical floor with credential checks, and the pressurised strongroom.",
        },
        {
          term: "Hidden factor",
          text: "A relief shift technician rests in the environmental alcove; their welding rig lantern is visible before entry.",
        },
        {
          term: "Point of no return",
          text: "Lifting the specie canister trips a pneumatic pressure differential; the clerical corridor seals immediately, forcing the getaway through the venting chutes.",
        },
        {
          term: "Pressure",
          text: "The volatile coolant jacket has three integrity marks; hard drops or rapid depressurisation advance the breach clock.",
        },
        {
          term: "Default complication",
          text: "The inside contact who held the crane bypass has already been detained and is being interrogated in customs security.",
        },
        {
          term: "Escape problem",
          text: "The main gantry walkway seals five minutes after the alarm trips; the crew must navigate the unpressurised exterior gantry.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Score",
      paragraphs: [
        "The Breakwater Vault is a heavy ferrocrete and lead-shielded strongroom bolted directly to the primary docking spine of Last Light Outpost. Originally built as a neutral assay office for independent asteroid miners, the facility was commandeered six months ago by customs authorities to hold contraband, impounded ore shipments, and disputed bearer bonds seized from blockade-running freighters.",
        "Tonight, the vault holds four pressurised cylinders of refined pitch-cobalt specie and the unredacted assay ledger that proves the consortium manufactured the current fuel shortage. A buyer has offered enough fuel credits to clear the crew's ship debts three times over, but the consignment is scheduled for loading aboard a heavy naval transport at dawn.",
      ],
    },
    {
      kind: "list",
      heading: "Casing & Inside Intel",
      items: [
        {
          term: "Entry vector",
          text: "The cargo crane maintenance rail on the dorsal hull has a thirty-second blind spot between sensor sweeps.",
        },
        {
          term: "Security routine",
          text: "Shift change occurs at 03:00, creating a five-minute window where paperwork handovers distract the interior guards.",
        },
        {
          term: "Known hazard",
          text: "The strongroom's pneumatic locks are slaved to an atmospheric seal; venting the airlock without authorisation triggers station-wide sirens.",
        },
        {
          term: "Vault detail",
          text: "The specie cylinders rest inside an electrified magnetic cradle that requires either a customs keycard or a delicate shunt across the grounding studs.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Hidden Factor",
      paragraphs: [
        "A night-shift maintenance tech has set up an improvised bunk in the environmental service alcove right beside the vault intake duct. Their work lamp is visible as an amber glow through the ventilation grating. The crew can wait twelve minutes for the tech to leave on a filter inspection, trigger a harmless steam leak in the adjacent laundry gantry to draw them out, or bluff past them with a forged repair ticket.",
      ],
    },
    {
      kind: "list",
      heading: "Security Rings",
      items: [
        {
          term: "Outer Ring (Gantry Moorings)",
          text: "Sweeping sodium arc-lights and pressure-suited sentries patrolling the magnetic crane track. Pass by timing the sensor sweep, crawling through the unpressurised conduit run, or posing as external hull inspectors.",
        },
        {
          term: "Access Ring (Clerical Floor & Lockup)",
          text: "Mag-coded security doors, locked biometric checkpoints, and a veteran customs sergeant at the dispatch desk. Pass by using cloned transit credentials, creating an electrical distraction at the power sub-station, or climbing through the waste reclamation shaft.",
        },
        {
          term: "Inner Vault (The Pressurised Strongroom)",
          text: "A pneumatic vault door with dual keycard interlocks, thermal motion wires, and an automated vacuum purge protocol. Pass by lifting the master key from the duty officer, picking the mechanical bypass while bypassing the grounding sensor, or cutting through the reinforced inspection hatch.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Alarm Track",
      items: [
        {
          term: "0 — Quiet",
          text: "Routine patrols hold to schedule, station staff are bored, and external docking bays operate normally.",
        },
        {
          term: "1 — Suspicion",
          text: "A guard notices a spliced conduit or an out-of-order crane rail. Patrols leave their set routes to investigate, eliminating predictable timing gaps.",
        },
        {
          term: "2 — Alert",
          text: "An open vault door, severed alarm wire, or spotted intruder raises the alarm. Sirens echo down the docking spine; station guards take up combat positions and seal internal fire doors. Reinforcements arrive in five minutes.",
        },
        {
          term: "3 — Lockdown",
          text: "Primary walkways and transit elevators lock down completely. The external crane power cuts out, and armed customs strike teams begin sweeping corridor by corridor. Only maintenance crawlways and exterior airlocks remain viable.",
        },
        {
          term: "4 — Lethal Response",
          text: "Station defence turrets deploy along the outer hull, and a heavily armed customs gunboat detaches from its mooring to intercept any departing vessel or unmoored suit.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Complications",
      items: [
        {
          term: "Likely (default)",
          text: "The inside crane operator who promised to leave the dorsal hatch unlocked was detained during an unannounced contraband sweep an hour before infiltration.",
        },
        {
          term: "Alternative",
          text: "A rival salvage crew is already in position inside the secondary vent line, waiting for the players to crack the vault before ambushing them.",
        },
        {
          term: "Alternative",
          text: "The station marshal has secretly placed marked isotope tracer pellets inside the specie canisters to track the buyer.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When the Prize Is Taken",
      paragraphs: [
        "The moment the four specie canisters are uncoupled from the magnetic cradle, the vacuum seal registers a mass drop. Even if bypassed electronically, a thirty-minute physical gauge inspection will inevitably spot the missing weight.",
        "Worse, breaking the magnetic seal automatically triggers the secondary pressure bulkhead on the clerical corridor, slamming a half-ton blast door shut. The entry route is gone. Alert level immediately rises to 2, starting the countdown before customs gunboats surround the spine.",
      ],
    },
    {
      kind: "list",
      heading: "The Getaway",
      items: [
        {
          term: "Race the Lockdown",
          text: "Sprint down the service ladder to the lower freight airlock before the five-minute timer expires, dodging arriving guards in the narrow gantry tunnels.",
        },
        {
          term: "Exterior Space-Walk",
          text: "Blow the emergency decompression hatch and tether across five hundred metres of vacuum to an unmonitored ore barge, braving station spotlights and cold drift.",
        },
        {
          term: "Disguised Evacuation",
          text: "Stash the cylinders inside a hazardous waste drum and join the panicked station workers evacuating toward the emergency shelter bays.",
        },
        {
          term: "Pursuit",
          text: "If the crew is identified before clearing the mooring clamps, a customs cutter with a high-yield grapple cannon gives chase through the perimeter debris field.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Flashback Opportunities",
      items: [
        {
          text: "A forged maintenance requisition slip slipped into the duty clerk's outbox earlier that morning.",
        },
        {
          text: "A mag-clamp emergency tether cached along the exterior hull during a routine docking three days ago.",
        },
        {
          text: "A bribed fuel technician who rigged the station siren to sound false alarms in the wrong sector.",
        },
        {
          text: "Memorised override frequencies for the cargo crane winch, learned from a former outpost rigger.",
        },
        {
          text: "A debt called in with an outpost fence who has a fast shuttle idling with engines warmed behind an asteroid ridge.",
        },
      ],
    },
  ],
  annotation: {
    heading:
      "A score designed around pressure, shifting stakes, and the getaway",
    paragraphs: [
      "Traditional tabletop heists often collapse under two competing failure modes: either the GM prepares a rigid script where a single failed stealth check triggers an immediate combat slog, or the prep remains so loose that every obstacle feels arbitrary. The Breakwater Vault demonstrates how the Heist Generator establishes a coherent, pressure-filled situation rather than a predetermined plot.",
      "The concentric security rings and explicit alarm ladder provide the GM with progressive fictional consequences. A botched lockpick check does not end the run with an immediate party wipe; it pushes the alarm to Suspicion, tightening guard rotations and forcing the players to spend a flashback or adapt their route.",
      "Crucially, the point of no return fundamentally transforms the second half of the session. Infiltrating the vault is an exercise in quiet timing and reconnaissance; extracting the heavy, volatile specie canister after the primary blast door has slammed shut turns the getaway into a desperate, high-stakes escape. Connected to Last Light Outpost and The Cinder Wren, it shows how a single score can naturally hook into ongoing campaign lore.",
    ],
  },
  connectedTo: {
    slug: "the-cinder-wren-space-western-ship",
    note: "The score takes place at Last Light Outpost, where The Cinder Wren operates and smuggles contraband past customs.",
  },
  relatedGenerators: [
    {
      title: "Heist generator",
      description:
        "Generate a complete, table-ready score with security rings and alarm tracks.",
      href: "/generators/heist",
    },
    {
      title: "Ship Generator",
      description:
        "Generate a frontier gunship or smuggler freighter to pull off the score.",
      href: "/generators/ship-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the mining consortium or customs syndicate guarding the vault.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    {
      title: "How to run a heist in a tabletop RPG",
      description:
        "The core framework behind concentric rings, alarm tracks, and flashbacks.",
      href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Space Western Campaigns",
      description:
        "Frontier outposts, battered freighters, and high-stakes scores in one connected vault.",
      href: "/for/space-western",
    },
  ],
  relatedExamples: ["the-cinder-wren-space-western-ship"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2790",
  seo: {
    title: "Space Western heist example: The Breakwater Vault | Codex Cryptica",
    description:
      "A table-ready Space Western heist at Last Light Outpost: security rings, an escalating alarm ladder, a volatile prize, and a compromised getaway.",
  },
};
