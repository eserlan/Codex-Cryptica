import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2660. Fills the 'item' kind gap (#2643) with an
 * Artifact & Relic generator roll. Output reproduced verbatim. Shorter than
 * the settlement/faction examples by design — the annotation carries the
 * table-use value instead of padding.
 */
export const vaelgrasp: ExampleConfigInput = {
  slug: "vaelgrasp-the-regents-ruin-artifact",
  name: "Vaelgrasp, the Regent's Ruin",
  title: "Fantasy artifact example: Vaelgrasp, the Regent's Ruin",
  kind: "item",
  genre: "Classic Fantasy",
  summary:
    "A golden-age greatsword that made one king unkillable and every king after him worse, currently wielded by the tyrant who will not admit what it has already cost him.",
  provenance: "raw",
  generator: {
    name: "Artifact & Relic generator",
    href: "/generators/artifact-generator",
  },
  context: [
    { label: "Genre", value: "Classic Fantasy" },
    { label: "Item Form", value: "Weapon / Implement of War" },
    { label: "Origin Era", value: "Fallen Golden Age" },
    {
      label: "Power Tier",
      value: "Regional Masterpiece (Dominates cities & provinces)",
    },
    { label: "Current Status", value: "Wielded by a Tyrant / Rival" },
    {
      label: "Curse / Cost",
      value: "Creeping Corruption (Gradual physical/spiritual decay)",
    },
  ],
  output: [
    {
      kind: "prose",
      heading: "Physical Description",
      paragraphs: [
        "Vaelgrasp is a hand-and-a-half greatsword of blackened silver-steel, its blade etched edge to edge with a coronation oath in a script no living scholar can fully translate — only the first line, worn smooth by five centuries of thumbs tracing it before battle, is still legible: 'I swear this kingdom will not fall while I hold it.' The crossguard is cast in the shape of two hands clasped in a formal grip of state, and the pommel holds a single flawless garnet that is warm to the touch even in a cold room.",
        "The blade does not tarnish, chip, or dull, but it is never quite clean. A faint red-brown sheen returns to the fuller within hours of every polishing, visible only at an angle, and old court records describe the same phenomenon in reigns four hundred years apart. Anyone who has held it for more than a season develops the same tell: a permanent, faint tremor in the sword hand that stops the instant Vaelgrasp is drawn.",
      ],
    },
    {
      kind: "facts",
      heading: "Quick Reference",
      facts: [
        { label: "Item Form", value: "Weapon / Implement of War" },
        { label: "Origin Era", value: "Fallen Golden Age" },
        {
          label: "Power Tier",
          value: "Regional Masterpiece (Dominates cities & provinces)",
        },
        { label: "Current Status", value: "Wielded by a Tyrant / Rival" },
        {
          label: "Curse / Cost",
          value: "Creeping Corruption (Gradual physical/spiritual decay)",
        },
        { label: "Setting / Theme", value: "Classic Fantasy" },
      ],
    },
    {
      kind: "list",
      heading: "Artifact Powers & Manifestations",
      items: [
        {
          term: "Dormant Powers",
          text: "Unsheathed, Vaelgrasp radiates a low, unspoken authority: soldiers hesitate before striking its bearer, crowds part without being told to, and lies told in its presence ring slightly false even to the liar. None of this is magic anyone can point to — it simply makes rooms behave as though a king is in them.",
        },
        {
          term: "Awakened Powers",
          text: "Struck in earnest, the blade drinks the vitality of whoever it wounds and feeds a fraction of it back into the wielder's own body, closing wounds and steadying failing hearts mid-battle. A bearer who commits fully to a fight can walk away from injuries that should have killed them three times over.",
        },
        {
          term: "Ascendant / Zenith Powers",
          text: "Once per generation, a bearer willing to speak the full coronation oath aloud — not the worn first line, but all of it, from memory, meaning every word — can bind the sword's authority to an entire province for as long as they hold it drawn: rebellions stall mid-formation, defectors' resolve simply fails them, and the land itself seems reluctant to let its rightful king lose.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Attunement & Awakening Requirements",
      paragraphs: [
        "Vaelgrasp attunes to whoever draws it with genuine intent to rule, not merely to fight — a mercenary or a bodyguard can wield it as dead steel, but only someone who wants the authority it grants will feel the pommel warm and the crossguard's clasped hands tighten fractionally under their own.",
      ],
    },
    {
      kind: "prose",
      heading: "Cost, Curse, Corruption, or Taboo",
      paragraphs: [
        "Every wound the blade heals borrows against the wielder's own remaining vitality rather than restoring it — the tremor in the sword hand is the first visible sign, followed by a creeping greyness at the temples, a persistent cold the wielder stops mentioning after the first year, and eventually a hollowing of the eyes that courtiers learn not to comment on. The oath the sword was forged to keep — 'this kingdom will not fall while I hold it' — is not a blessing so much as a debt collection: the sword keeps the kingdom standing by quietly, slowly, spending the one holding it.",
        "No bearer in Vaelgrasp's recorded history has died of old age. All of them have died still holding it, in office, having refused every opportunity to set it down.",
      ],
    },
    {
      kind: "list",
      heading: "Known History & Previous Keepers",
      items: [
        {
          text: "Forged for King Ondrel the Steadfast during the Concord Wars, when the fracturing Sunfall Kingdoms needed one ruler who could not be assassinated, deposed, or bribed into losing. Ondrel held the throne for sixty-one years and was, by every surviving account, exactly as steadfast as advertised — and exactly as grey and hollow-eyed by the end.",
        },
        {
          text: "Passed formally at Ondrel's death to his chosen heir, but every reign since has been shorter and more brutal than the one before it, as though the sword's authority compounds interest each time it changes hands without the outgoing bearer's willing consent.",
        },
        {
          text: "Currently held by Regent-Protector Casimir Vane, who took it from a dying predecessor eleven years ago and has not been seen to sleep more than four hours a night since. His court insists this is dedication. His household staff have started leaving quietly, one at a time.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Interested Factions & Pursuers",
      items: [
        {
          term: "The Sunfall Restoration Council",
          text: "A coalition of disinherited lesser houses who believe the sword's authority — not Vane's own claim — is the only thing keeping his regency intact, and want it removed before he can name a successor.",
        },
        {
          term: "The Cartographers' Guild of Ondrel's Rest",
          text: "Quietly funding research into the untranslated portions of the coronation oath, convinced the full text names a specific line of succession the current regency has been suppressing.",
        },
        {
          term: "Vane's own Master of Household",
          text: "Has watched three of the regent's predecessors die still holding the sword and is running out of ways to raise the subject without being executed for treason.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Rumours & Conflicting Legends",
      items: [
        {
          text: "Common belief holds that Vaelgrasp chooses its bearer, when in truth it accepts anyone who genuinely wants to rule — the sword has never once been selective, only patient.",
        },
        {
          text: "Court poets maintain the red-brown sheen on the blade is Ondrel's own blood, preserved by magic; the more mundane truth, known to few, is that it reappears fresh on every bearer regardless of whether they have ever bled on it in battle.",
        },
        {
          text: "It's whispered that a bearer who sets the sword down and refuses to pick it back up can end the curse outright — no version of this has ever been tested, because no bearer has yet chosen to find out.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Adventure Hooks",
      items: [
        {
          text: "The Restoration Council hires the party to steal Vaelgrasp before Regent Vane can complete a succession ritual that would bind its authority to his bloodline permanently.",
        },
        {
          text: "Vane's Master of Household approaches the party privately, asking them to find out what actually happens to a bearer who sets the sword down — before the regent's health forces the question regardless.",
        },
        {
          text: "The Cartographers' Guild offers to fund an expedition to Ondrel's original coronation site in exchange for a rubbing of the sword's full, untranslated inscription.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Destruction or Sealing Conditions",
      paragraphs: [
        "The blade can only be unmade by a willing bearer speaking the full coronation oath in reverse at the site of Ondrel's original coronation, an act which returns to that bearer, all at once, every year of vitality the sword has spent keeping them upright — no one has attempted it in living memory, and no one is certain any bearer would survive doing so.",
      ],
    },
  ],
  annotation: {
    heading: "Why a short generator output is still worth publishing",
    paragraphs: [
      "The settlement and faction examples in this library run long because those artefacts are meant to seed an entire session. An artifact roll is a different shape of tool — it is meant to be introduced once, sit in a campaign for a long time, and reward a GM who reads the fine print rather than the summary. That means the value here isn't in more output, it's in output dense enough to reread.",
      "Notice the actual design move: the curse is not a separate drawback bolted onto the powers, it's the same mechanism running in reverse. The healing the sword grants in combat and the decay it inflicts between battles are the same transaction — vitality moved from the bearer to the moment that needs it — which is what makes Vane's situation legible at a glance instead of needing three paragraphs of exposition. A GM can hand a player 'it heals you but it's aging you' in one sentence and the rest of the campaign follows from that logically.",
      "The other thing worth stealing directly: none of the three interested factions want the same thing from the sword. The Restoration Council wants it gone, the Cartographers' Guild wants what's written on it, and the Master of Household just wants to know if his employer can survive setting it down. That's three separate adventure hooks sitting in one artifact roll, none of which require the party to fight anyone over ownership of the blade itself.",
    ],
  },
  relatedGenerators: [
    {
      title: "Artifact & Relic generator",
      description:
        "Generate a unique, campaign-shaping artifact with tiered powers, a real cost, pursuing factions, and destruction conditions. Free, no login.",
      href: "/generators/artifact-generator",
    },
    {
      title: "Magic item generator",
      description:
        "Roll smaller, more portable magic items for when a full artifact is too much weight for the scene.",
      href: "/generators/magic-item",
    },
  ],
  relatedAnswers: [],
  relatedForPages: [],
  relatedExamples: [],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2660",
  seo: {
    title:
      "Fantasy artifact example: Vaelgrasp, the Regent's Ruin | Codex Cryptica",
    description:
      "A dense, campaign-shaping magic-weapon roll from the Artifact & Relic generator, with tiered powers, a self-consuming curse, and three competing pursuers.",
  },
};
