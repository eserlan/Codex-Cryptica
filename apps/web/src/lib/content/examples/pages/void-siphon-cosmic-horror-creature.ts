import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2658. Fills the 'creature' kind gap (#2642) with a
 * Cosmic Horror Creature generator roll. Output reproduced verbatim, with
 * the generator's own player-facing "content" and GM-only "lore" halves
 * both shown and labelled.
 */
export const voidSiphon: ExampleConfigInput = {
  slug: "void-siphon-cosmic-horror-creature",
  labels: ["cosmic-horror"],
  name: "The Void-Siphon",
  title: "Cosmic Horror creature example: The Void-Siphon",
  kind: "creature",
  genre: "Cosmic Horror",
  theme: "cosmic_horror",
  summary:
    "A wagon-sized deep-water aberration that drinks sound and light from a stretch of ocean, leaving fishing crews becalmed in a silence that hides what is actually circling them.",
  provenance: "raw",
  generator: {
    name: "Creature generator",
    href: "/generators/creature",
  },
  context: [
    { label: "Genre", value: "Cosmic Horror" },
    { label: "Category / Origin", value: "Aberration / Eldritch Horror" },
    { label: "Threat Level", value: "Elite / Monstrous Hazard" },
    { label: "Size", value: "Huge / Wagon-sized" },
    { label: "Temperament", value: "Alien / Incomprehensible Mind" },
    { label: "Habitat", value: "Oceans & Deep Waters" },
    { label: "Ecological Role", value: "Environmental / Supernatural Hazard" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/creature-void-siphon.jpg",
    alt: "The Void-Siphon lurking beneath the glass-like water near a becalmed sailing ship under a grey sky",
  },
  output: [
    {
      kind: "list",
      heading: "At a Glance",
      items: [
        { term: "Classification", text: "Aberration / Eldritch Horror" },
        { term: "Size & Form", text: "Huge, wagon-sized; no fixed silhouette" },
        {
          term: "Habitat",
          text: "Deep ocean trenches, surfacing near becalmed ships",
        },
        { term: "Threat Level", text: "Elite / Monstrous Hazard" },
        {
          term: "Temperament / Sapience",
          text: "Alien / Incomprehensible Mind",
        },
        {
          term: "Ecological Role",
          text: "Environmental / Supernatural Hazard",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Appearance & Anatomy",
      paragraphs: [
        "The Void-Siphon has no single body plan that holds still long enough to be sketched twice the same way. Beneath the surface it reads as a loose lattice of oily black cartilage, folding and refolding around a central cavity that never quite closes — witnesses describe it as 'a throat wearing a jellyfish as a coat.' Where light should reflect off its surface, it simply does not; divers report their torch beams appearing to bend around it rather than illuminate it.",
        "It has no visible eyes, mouth, or limbs in any conventional arrangement. Instead, dozens of thin cartilage vanes trail from its central mass, each one terminating in a cluster of pale, lidless spots that are not eyes but appear to serve the same directional function. When it moves, it does so in total silence, without displacing water in the way its bulk should.",
      ],
    },
    {
      kind: "prose",
      heading: "Core Concept & Ecology",
      paragraphs: [
        "The Void-Siphon does not eat in any way a ship's naturalist would recognise. It feeds on ambient sound and light within a slowly contracting radius, drawing both down into its central cavity the way a whirlpool draws water. A patch of open ocean it has fed on for more than an hour goes eerily flat: no gull cries, no slap of waves, and a grey, shadowless quality to the daylight that makes lookouts misjudge distance badly.",
        "It ranges wherever deep trenches come close to shipping lanes, surfacing only when a vessel sits still long enough — becalmed, anchored, or drifting — for a sustained feed. It has no den, no young observed, and no known interaction with any other deep-sea species; things that stray into its feeding radius simply stop making sound.",
      ],
    },
    {
      kind: "list",
      heading: "Observable Abilities & Defences",
      items: [
        {
          term: "Sound and light drain",
          text: "Within a slowly shrinking radius around itself, ambient noise deadens and daylight flattens toward grey, worsening the longer it feeds.",
        },
        {
          term: "Silent bulk",
          text: "Moves without wake, ripple, or displacement sound despite its size, making its approach nearly impossible to hear or feel through a hull.",
        },
        {
          term: "Vane lash",
          text: "When threatened or interrupted mid-feed, it whips its trailing vanes in a wide arc, capable of staving in a longboat's planking or snapping a mast stay.",
        },
        {
          term: "Light-bending hide",
          text: "Its surface refuses to reflect light normally, making it very hard to spot at range even in clear water and calm seas.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Known Weaknesses & Limitations",
      items: [
        {
          term: "Needs stillness to feed",
          text: "It cannot maintain a feeding radius against a moving vessel; a ship that keeps way on and changes heading disrupts the drain entirely.",
        },
        {
          term: "Sensitive to sudden loud percussion",
          text: "A cannon shot, ship's bell rung hard, or similar sharp burst of sound causes it to recoil and break off, though it recovers within minutes.",
        },
        {
          term: "Slow beneath the surface",
          text: "Its underwater movement is markedly slower than its silent approach suggests; a rowed boat can outpace it in open water once alerted.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Combat & Encounter Behaviour",
      paragraphs: [
        "The Void-Siphon does not hunt aggressively. It surfaces beneath a becalmed vessel, begins its drain, and reacts to interruption rather than initiating harm. A crew that notices the encroaching silence early and forces noise — drums, gunfire, shouting in shifts — can drive it off before the radius closes far enough to threaten them directly.",
        "If cornered, wounded, or prevented from breaking off, it lashes with its vanes indiscriminately and attempts to submerge, dragging anything entangled in its trailing cartilage down with it. It shows no morale in the conventional sense; it disengages purely on sensory grounds, not out of anything resembling fear or calculation.",
      ],
    },
    {
      kind: "list",
      heading: "Harvest & Remains",
      items: [
        {
          term: "Vane cartilage",
          text: "A single trailing vane, if cut and preserved in oil, dampens sound in a small radius around it for weeks — prized by smugglers and quietly banned in several ports.",
        },
        {
          term: "Cavity residue",
          text: "A greasy black residue lines the central cavity; alchemists pay well for it, though extended handling causes temporary hearing loss in anyone without protective wax.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Known Lore & Signs",
      items: [
        {
          term: "The Long Quiet",
          text: "Sailors' term for the flattened, grey stillness that precedes a surfacing; old hands order full sail and noise the moment it sets in rather than waiting to see what causes it.",
        },
        {
          term: "Flat gulls",
          text: "Seabirds veer sharply away from any patch of ocean it has recently fed in, refusing to cross even when following a normal fishing boat.",
        },
        {
          term: "Coastal folklore",
          text: "Fishing villages near known trenches tell of 'the sea holding its breath' and treat unnatural calm on an otherwise windy day as reason enough to turn back to harbour.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Sapience & Society",
      items: [
        {
          term: "Communication style",
          text: "None observed. It shows no response to speech, signalling, or attempts at parley of any kind, treating all sound purely as a resource rather than as a signal.",
        },
        {
          term: "Visible customs",
          text: "None. It has never been observed near another of its kind, and no behaviour suggesting territory-marking, courtship, or cooperation has been recorded.",
        },
        {
          term: "Public relations with outsiders",
          text: "Purely predatory-passive: it neither seeks out nor avoids vessels, reacting only to stillness and, secondarily, to interruption.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "GM-Only: True Origin & Hidden Ecology",
      paragraphs: [
        "The Void-Siphon is not a predator in the ordinary sense — it is a single cell of a much larger, dormant organism that lines an entire trench wall kilometres down, and the 'creature' encountered near the surface is a bud the trench-mass extrudes and reabsorbs once it has fed enough. Killing one does nothing to the source; a fresh bud surfaces from the same trench within a season if ships keep sitting still above it.",
        "It has no reproductive cycle a naturalist would recognise because it does not reproduce individually — the trench-mass is the organism, and every Void-Siphon anywhere in the world's oceans is, in a sense, the same creature. This is never stated outright anywhere in the setting; it is a conclusion available only to someone who cross-references sightings across widely separated coastlines and notices the pattern.",
      ],
    },
    {
      kind: "list",
      heading: "GM-Only: Hidden Abilities & Surprises",
      items: [
        {
          term: "Second-phase collapse",
          text: "If its feeding radius is fully starved of sound and light for more than a few minutes (total silence and total darkness together), it does not retreat — it collapses inward and detonates outward as a wave of absolute silence that can rupture eardrums and black out vision at close range before it flees.",
        },
        {
          term: "False stillness",
          text: "It can hold a feeding radius stable without visibly changing for hours, letting a crew believe the danger has passed when it is still directly beneath the hull, simply no longer expanding its drain.",
        },
      ],
    },
    {
      kind: "list",
      heading: "GM-Only: Secret Weaknesses",
      items: [
        {
          term: "True vulnerability is rhythm, not volume",
          text: "It is not actually driven off by loudness — it is driven off by irregular, unpredictable percussion. A ship's bell rung on a steady interval barely troubles it; a chaotic drum pattern with no discernible beat disorients it badly, because its sensory vanes read pattern, not amplitude.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "GM-Only: Tactical Notes",
      paragraphs: [
        "Run the encounter as a countdown, not a fight. Track the shrinking radius in rough zones — outer (muffled sound, greyer light), middle (near-total silence, shapes hard to judge), inner (the ship itself goes silent, including voices). Escalate consequences as the radius tightens rather than triggering combat at a fixed distance.",
        "If the party tries to fight it directly rather than disrupt the drain, let the vane lash be genuinely dangerous — this is meant to teach the table that disruption, not damage, is the intended solution, without ever saying so out loud.",
      ],
    },
    {
      kind: "prose",
      heading: "GM-Only: Truth Behind Rumours",
      paragraphs: [
        "\"The sea holding its breath\" is not superstition dressed up — coastal communities are describing the feeding radius with total accuracy, they simply lack the framework to know what causes it. Any NPC elder who insists the old stories are 'just stories, but still' is, in this setting, correct twice over.",
      ],
    },
    {
      kind: "list",
      heading: "GM-Only: Adventure & Encounter Hooks",
      items: [
        {
          term: "Chart the trench",
          text: "A cartographer or naturalist NPC wants the party to help triangulate feeding sites across several sightings, edging toward the trench-mass discovery without ever confirming it outright this session.",
        },
        {
          term: "Harvest under pressure",
          text: "A smuggling contact wants a live vane cut for its sound-dampening cartilage, which means holding a feeding radius open deliberately rather than disrupting it — a much riskier proposition than escaping one.",
        },
        {
          term: "The becalmed convoy",
          text: "A merchant convoy has sat motionless for two days in dead calm, well past the point anyone should still be alive aboard; the party is hired to find out why the ships are still afloat and, worse, still occupied.",
        },
        {
          term: "Silence as a weapon",
          text: "A hostile faction has learned to lure the Void-Siphon toward a rival's harbour deliberately, using it as a blockade tool rather than treating it as a hazard to avoid.",
        },
      ],
    },
    {
      kind: "list",
      heading: "GM-Only: Secret Motives & Hidden Society",
      items: [
        {
          term: "No motive, correctly",
          text: "Resist the urge to give the trench-mass an agenda. Its total absence of intent — it is closer to a tide than a mind — is the actual horror on offer here; any GM twist that gives it a goal weakens the piece.",
        },
        {
          term: "Cults that misread it",
          text: "Coastal cults occasionally worship feeding sites as oracular 'zones of the god's attention,' which is a usable false lead: their rituals do nothing to the Void-Siphon, but the cult itself is a real, dangerous faction the party can run into independently of the creature.",
        },
      ],
    },
    {
      kind: "facts",
      heading: "Creature profile",
      facts: [
        { label: "Category", value: "Aberration / Eldritch Horror" },
        { label: "Genre", value: "Cosmic Horror" },
        { label: "Size", value: "Huge / Wagon-sized" },
        { label: "Threat Level", value: "Elite / Monstrous Hazard" },
        { label: "Habitat", value: "Oceans & Deep Waters" },
        {
          label: "Ecological Role",
          value: "Environmental / Supernatural Hazard",
        },
      ],
    },
  ],
  annotation: {
    heading: "What the GM-only half is actually for",
    paragraphs: [
      "The Creature generator splits every roll into two halves, and this page keeps that split visible rather than flattening it into one description. Everything above the 'GM-Only' sections is what the generator marks as observable — appearance, known abilities, field signs, folklore. Read alone, the Void-Siphon looks like an ambient hazard: drift away, make noise, done. That is exactly what it should look like from a deck at range.",
      "The GM-only half is where the encounter actually gets its teeth. It is where the drain's true mechanism, its second-phase trigger, and its actual origin live — the details a GM needs to run the thing dynamically without inventing a twist mid-session. That is the split worth noticing: it is not a spoiler wall, it is a workflow. The observable half is what a player learns by asking 'what does my character see'; the hidden half is what a GM consults when the party does something the observable half didn't anticipate.",
      "Notice too what the hidden half deliberately withholds: a motive. The trench-mass origin explains the biology, but it never gives the Void-Siphon an agenda, and the tactical notes say outright to resist inventing one. For a Cosmic Horror creature specifically, that absence of intent is the point — a hazard that wants something is a negotiation waiting to happen, and this one isn't.",
    ],
  },
  relatedGenerators: [
    {
      title: "Creature generator",
      description:
        "Generate original beasts, aberrations, and horrors with a player-facing half and a GM-only half. Free, no login.",
      href: "/generators/creature",
    },
    {
      title: "NPC generator",
      description:
        "Roll fully-realised NPCs with quirks, motives, hooks, and secrets.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    {
      title: "What makes a good random encounter?",
      description:
        "Why a wandering monster with no context is an interruption, and what turns the same creature into a scene.",
      href: "/answers/what-makes-a-good-random-encounter",
    },
    {
      title: "How do I balance RPG combat encounters without a TPK?",
      description:
        "Reading threat level and escape routes into a monstrous hazard before the table meets it.",
      href: "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cosmic Horror",
      description:
        "Occult orders, anomalous sites, and forbidden knowledge for dread-driven campaigns.",
      href: "/for/cosmic-horror",
    },
  ],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2658",
  seo: {
    title: "Cosmic Horror creature example: The Void-Siphon | Codex Cryptica",
    description:
      "A Cosmic Horror creature roll from the Creature generator, with both the player-observable half and the labelled GM-only half shown in full.",
  },
};
