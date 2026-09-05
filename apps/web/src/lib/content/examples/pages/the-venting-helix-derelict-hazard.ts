import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2553. A non-location artefact, chosen so the initial set
 * is not three variations on "a place". Output reproduced unedited.
 */
export const theVentingHelix: ExampleConfigInput = {
  slug: "the-venting-helix-derelict-hazard",
  labels: ["space-opera-resistance"],
  name: "The Venting Helix",
  title: "Sci-fi encounter example: The Venting Helix",
  kind: "encounter",
  genre: "Space opera",
  theme: "scifi",
  summary:
    "Deep within the drifting hull of the Astragal-Nine, the crew must halt a runaway atmospheric purge loop before the counter-rotating habitat rings tear themselves apart.",
  provenance: "raw",
  generator: { name: "Puzzle generator", href: "/generators/puzzle" },
  context: [
    { label: "Genre", value: "Space opera" },
    { label: "Complexity", value: "Moderate" },
    { label: "Purpose", value: "Disable device" },
    { label: "Failure pressure", value: "Danger / physical peril" },
    { label: "System", value: "System-neutral" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/puzzle-venting-helix.jpg",
    alt: "A frost-choked maintenance gantry above a wildly spinning cryogenic core, lit by strobing emergency beacons",
  },
  output: [
    {
      kind: "prose",
      heading: "Player-facing setup",
      paragraphs: [
        "The team steps onto the primary maintenance gantry of the Astragal-Nine's central atmospheric fusion manifold. The cavernous chamber is a blinding white tempest of swirling frost, screaming slipstream winds, and strobing emergency beacons. Below the gantry, a massive cylindrical core — the cryogenic inertia-stabilizer — is spinning wildly off-axis, its magnetic guidance rings sparking blue lightning. The console panel at the gantry's head is locked in an automated diagnostic cycle, but its manual bypass ports, hydraulic override valves, and exposed optical data-bus trunks are fully accessible. Every ten seconds, a sonic pulse from the purge cycle rattles the deckplates, threatening to break the gantry's moorings and pitch everyone into the freezing vacuum beyond the fractured bulkhead.",
      ],
    },
    {
      kind: "list",
      heading: "Clues",
      items: [
        {
          term: "Acoustic resonance",
          text: "The metallic screech of the manifold changes pitch depending on the speed of the spinning core, dropping an octave whenever the portside hydraulic line vibrates against the gantry support.",
        },
        {
          term: "Thermal scars",
          text: "Burn marks and frost patterns on the bulkhead indicate that the manifold's emergency release valves were previously hammered shut by hand, leaving heavy stress fractures near the primary coolant intake.",
        },
        {
          term: "Data-ghost echoes",
          text: 'Flickering terminal screens cast ghostly text remnants into the swirling fog, showing repeating error logs: "Inertia sync lost at quadrant zero; counterbalance synchronization mandatory."',
        },
        {
          term: "Spatial geometry",
          text: "The alignment lasers projecting from the chamber ceiling cross at a distinct point three meters off the main gantry, indicating where the stabilizer's kinetic energy should be focalized.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Character spotlight opportunities",
      items: [
        {
          term: "Physically robust characters",
          text: "Can physically wedge structural struts into the vibrating stabilization rings, manually crank heavy hydraulic pressure valves, or anchor tether lines to keep equipment from flying apart.",
        },
        {
          term: "Technologically adept characters",
          text: "Can splice into the exposed optical data-bus trunks to spoof the diagnostic loop, rewrite the manifold's purge parameters, or reroute auxiliary power from the life support grid.",
        },
        {
          term: "Perceptive and analytical characters",
          text: "Can read the acoustic and visual patterns of the spinning core to time manual interventions precisely between resonance spikes.",
        },
        {
          term: "Resourceful and creative characters",
          text: "Can use secondary gear — such as magnetic clamps, welding torches, or cryogenic coolants — to alter the physical environment and the manifold's thermal equilibrium.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Alternate solutions",
      items: [
        {
          term: "Kinetic jamming",
          text: "Wedging heavy mining charges or structural bulkheads directly into the manual braking teeth to force the spinning core to a grinding halt, risking structural shrapnel.",
        },
        {
          term: "Systemic spoofing",
          text: "Splicing a jury-rigged power cell into the data-bus to trick the manifold into believing the purge cycle is already complete, forcing an immediate safety shutdown.",
        },
        {
          term: "Thermal shock",
          text: "Venting reserve plasma or superheated engine bleed-air into the cryogenic intake to equalize the temperature differential and trick the automated safety governors.",
        },
        {
          term: "Manual counter-balancing",
          text: "Hooking winches and anchor cables to the stabilizer's exterior mounting brackets to manually haul the core back into its magnetic tracks.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Failure and escalation",
      items: [
        {
          term: "Failure state",
          text: "A failed attempt or ignored warning triggers a violent structural shudder. A wave of super-cooled nitrogen gas surges across the gantry, coating everything in thick rime and reducing visibility to zero, while the artificial gravity flickers dangerously.",
        },
        {
          term: "Escalation pressure",
          text: "The gantry's structural integrity drops another tier. The screeching manifold begins venting chunks of frozen atmosphere that ricochet through the chamber like shrapnel, and the countdown to habitat ring separation shrinks from minutes to seconds.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Running the puzzle",
      items: [
        {
          term: "Pacing",
          text: "Emphasize the sensory overload — the deafening roar of venting oxygen, the blinding white frost, and the physical push of the gantry swaying in the slipstream.",
        },
        {
          term: "Validating player inputs",
          text: "Treat any logical interaction with the manifold's physical components, control systems, or environment as a valid step toward stabilization. If players describe bracing, hacking, cutting, or rerouting, translate it directly into narrative progress.",
        },
        {
          term: "Fail-forward execution",
          text: "On a mixed result or failure, let the action succeed partially — such as jamming the core — but introduce an immediate complication, like a blown hydraulic line or a severed safety tether.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Scaling",
      items: [
        {
          term: "Lower stakes",
          text: "Reduce the environment to a smoky, non-freezing maintenance bay with stable gravity, turning the puzzle into a straightforward engineering diagnostic challenge.",
        },
        {
          term: "Higher stakes",
          text: "Add a complete loss of artificial gravity, shifting the entire encounter into three-dimensional zero-g where every movement requires thrusters or anchors, while hull breaches suck loose debris into open space.",
        },
      ],
    },
  ],
  annotation: {
    heading: "Four routes through, and none of them is the right answer",
    paragraphs: [
      "The reason this does not stall is that it was never built around a single intended solution. Kinetic jamming, data-bus spoofing, thermal shock and manual counter-balancing are four genuinely different approaches, each reachable by a different kind of character, and each with its own cost — shrapnel, a blown hydraulic line, a severed tether. A party that thinks of none of them can still brace, cut or reroute and be told that counts.",
      "Failure moves the situation rather than blocking it. Visibility drops, gravity flickers, the countdown shortens from minutes to seconds. Every wrong attempt spends something real and changes what the next attempt looks like, which is what stops the table from simply guessing again.",
      "The clues are physical rather than textual. A pitch that changes with the core's speed, valves that were hammered shut by hand, alignment lasers crossing three metres off the gantry. Nobody has to read a riddle aloud twice; they have to notice a room.",
    ],
  },
  relatedGenerators: [
    {
      title: "Puzzle generator",
      description:
        "Roll obstacles with layered clues and multiple solutions. Free, no login.",
      href: "/generators/puzzle",
    },
    {
      title: "Encounter generator",
      description:
        "Situations already in progress, across combat, social and environmental types.",
      href: "/generators/encounter",
    },
    {
      title: "Ship generator",
      description: "For the derelict itself — crew, quirks and history.",
      href: "/generators/ship-generator",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you design RPG puzzles that do not stall the game?",
      description:
        "The four properties this output demonstrates, and the safety valves to prepare in advance.",
      href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    },
    {
      title: "What makes a good random encounter?",
      description: "Why a situation in progress beats a stat block.",
      href: "/answers/what-makes-a-good-random-encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for space opera",
      description:
        "Systems, crews and derelicts connected across a galaxy-scale campaign.",
      href: "/for/space-opera",
    },
  ],
  relatedExamples: ["arc-hub-augmentation-slum"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2553",
  seo: {
    title: "Sci-fi encounter example: The Venting Helix | Codex Cryptica",
    description:
      "Unedited puzzle generator output — a derelict-ship hazard with four viable solutions, fail-forward escalation and scaling notes. System-neutral.",
  },
};
