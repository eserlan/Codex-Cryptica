import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2656. Fills the 'character' kind gap (#2641) with a
 * Gothic Horror BBEG / Campaign Villain generator roll. Output reproduced verbatim.
 */
export const ladyVivienneMorvath: ExampleConfigInput = {
  slug: "lady-vivienne-morvath-gothic-horror-villain",
  name: "Lady Vivienne Morvath",
  title: "Gothic Horror villain example: Lady Vivienne Morvath",
  kind: "character",
  genre: "Gothic Horror",
  summary:
    "A grieving matriarch and flesh-alchemist who embalms dying lineages in cold iron and mercury to freeze her decaying valley in permanent, immortal perfection.",
  provenance: "raw",
  generator: {
    name: "BBEG / Villain generator",
    href: "/generators/bbeg-generator",
  },
  context: [
    { label: "Genre", value: "Gothic Horror" },
    { label: "Tone", value: "Tragic & Sinister" },
    { label: "Villain archetype", value: "Mastermind / Fallen Matriarch" },
    {
      label: "World relation",
      value: "Curator (Preserving the past by harvesting the present)",
    },
    { label: "Threat scale", value: "Regional (Blackwood Valley)" },
    { label: "Degree of sympathy", value: "Understandable, Still Wrong" },
    {
      label: "Dominant conflict domain",
      value: "Alchemical Obsession / Lineage Preservation",
    },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/villain-lady-vivienne-morvath.jpg",
    alt: "Lady Vivienne Morvath in mourning silks standing before her alchemical embalming apparatus in Morvath Manor",
  },
  output: [
    {
      kind: "prose",
      heading: "Public Face",
      paragraphs: [
        "To the tenant farmers, parish priests, and weavers of the Blackwood Valley, Lady Vivienne Morvath is the last pious daughter of a ruined house. Clad in perpetual mourning silks within the damp stone halls of Morvath Manor, she quietly funds the local hospice, maintains the parish cemetery wall, and pays the winter grain-dole out of her dwindling family inheritance. Her heavy black carriage passes through fog-drowned lanes with shuttered blinds, and townsfolk speak of her with hushed deference as a noble martyr who chose to starve alongside her people rather than abandon her ancestral soil.",
      ],
    },
    {
      kind: "prose",
      heading: "Signature / Calling Card",
      paragraphs: [
        "Victims of her work are discovered seated peacefully in unlocked rooms, unmarked by violence save for fine silver sutures running beneath the hairline and a small wax seal pressed against the left collarbone bearing the Morvath crest: an owl clutching an hourglass. Their eyes are clouded with milky lead-salts, their blood replaced with aromatic preservative oils, and every heirloom of genealogical or historical significance has been neatly catalogued and removed.",
      ],
    },
    {
      kind: "list",
      heading: "First Signs",
      items: [
        {
          term: "Disappearing artisans",
          text: "The valley's last master clockmaker and two church glass-stainers were hired for private commissions at Morvath Manor six months ago; their apprentices still receive weekly stipend envelopes written in their masters' handwriting, but neither man has been seen in town.",
        },
        {
          term: "Grave registers excised",
          text: "Parish burial registers in three surrounding hamlets have had pages razor-cut and rebound, systematically removing all records of fourth-born children and unbaptised cousins.",
        },
        {
          term: "Lead and bell-metal shortages",
          text: "Carts carrying lead roofing sheets, antimony, and church bell-bronze to the regional cathedral have been purchased at three times market value by hooded bailiffs paying in mint-fresh sovereign coin.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Core Concept",
      paragraphs: [
        "Lady Vivienne Morvath is a regional-scale mastermind operating as an obsessive Curator of human memory and lineage. Facing the total physical decay of her valley and the extinction of its founding families through pestilence and generational poverty, she has turned to forbidden preservative arts. Rather than seeking godhood or destruction, she seeks to freeze the valley in amber—harvesting the living consciousness, genealogies, and vital humours of dying aristocrats into lead-lined phylactery chambers beneath her family crypt before the winter rot erases them forever.",
      ],
    },
    {
      kind: "prose",
      heading: "True Nature",
      paragraphs: [
        "Behind her public charity lies a horrifying industrial operation: the Great Reliquary. Vivienne believes that mortality is a bureaucratic oversight and that moral degradation is simply physical rot left unchecked. Her ultimate goal is the complete embalming of the valley's cultural elite into an immortal, clockwork court. By the winter solstice, she intends to flood the Blackwood basin with heavy mercurial fumes, placing every inhabitant into suspended preservation and establishing an eternal, silent museum where no memory can ever be forgotten, degraded, or lost.",
      ],
    },
    {
      kind: "prose",
      heading: "Why Now & Fatal Flaw",
      paragraphs: [
        "Two months ago, Vivienne was diagnosed with the same weeping lung-rot that claimed her three sons. With her own faculties failing and her family line facing total extinction within the year, she has abandoned all caution, accelerating her collection timeline from decades into a desperate, five-month campaign of abduction and embalming. Her fatal flaw is an absolute aesthetic vanity: she cannot bear imperfection. A single flawed memory, a cracked seal, or a recalcitrant subject provokes furious, destabilising revisions that create dangerous forensic anomalies her servants struggle to conceal.",
      ],
    },
    {
      kind: "list",
      heading: "Lieutenants & Inner Circle",
      items: [
        {
          term: "Father Lucian Vane (The Confessor)",
          text: "The parish vicar who lost his faith during the Great Murrain. He genuinely believes Vivienne's Great Reliquary is the only true salvation from damnation, providing her with baptismal registries and absolution; he privately grieves the children he has delivered to the crypt.",
        },
        {
          term: "Mistress Hannelore Brandt (The Chirurgeon)",
          text: "A disgraced university anatomist and chemist. Loyal strictly for access to Vivienne's unlimited supply of rare alchemical apparatus and fresh subjects; keeps detailed, hidden surgical journals as leverage in case regional inquisitors close in.",
        },
        {
          term: "Bailiff Gregor Cross (The Shield)",
          text: "The scarred commander of the manor guards. Motivated by an unrequited, lifelong devotion to Vivienne; will kill anyone who questions her orders, but secretly conceals evidence of her failing health to prevent panic among the staff.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The Villain's Plan",
      items: [
        {
          term: "Stage 1: The Quiet Ledger",
          text: "Vivienne's agents secure all historical church registers, family bibles, and municipal charters across the valley, identifying every surviving carrier of pure ancestral bloodlines. (Clue: church scribes attacked on lonely roads; parish archives mysteriously ransacked).",
        },
        {
          term: "Stage 2: Securing the Artisans",
          text: "Specialists in clockwork gears, alchemical distillation, and bell-metal casting are brought to the manor to construct the preservative manifolds. (Clue: heavy nightly carriage traffic; strange chemical smells carried on the river fog).",
        },
        {
          term: "Stage 3: Culling the Periphery",
          text: "Impoverished gentry and isolated heirs are quietly abducted during carriage journeys or lured to the manor under promises of financial rescue. (Clue: missing person notices torn down by bailiffs; forged letters arriving from distant cities).",
        },
        {
          term: "Stage 4: Sealing the Vale",
          text: "Under the guise of quarantining a new outbreak of lung-rot, Vivienne's guards blockade the mountain passes, trapping all valley residents within the basin. (Clue: armed checkpoints on the toll roads; travellers turned back by force).",
        },
        {
          term: "Stage 5: The Solstice Banquet",
          text: "The remaining valley nobles and clergy are invited to Morvath Manor for an ancestral memorial feast, where wine laced with paralytic belladonna will render them compliant for harvest. (Clue: opulent invitations sent with strict attendance demands; sudden flight of manor kitchen servants).",
        },
        {
          term: "Stage 6: The Eternal Court",
          text: "The Great Reliquary is activated, dispersing mercurial preservation vapour across the basin to freeze the valley in permanent stasis. (Consequence if unchecked: the valley becomes a silent, frost-bound mausoleum; hundreds preserved in living death).",
        },
      ],
    },
    {
      kind: "list",
      heading: "Discovery Layers",
      items: [
        {
          term: "What the World Knows",
          text: "Lady Vivienne is an unfortunate, grieving noblewoman living on family charity, struggling to keep her ancestral house intact against economic ruin.",
        },
        {
          term: "What Her Servants Know",
          text: "The lady is conducting secret alchemical experiments to cure her lung-rot and is paying generously to keep the work shielded from regional magistrates.",
        },
        {
          term: "GM-Only Truth",
          text: "Vivienne is not looking for a cure—she has embraced the end and is methodically preparing the entire valley for collective, embalmed preservation in her subterranean court.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Weakness & Moral Complication",
      paragraphs: [
        "The Great Reliquary depends on a delicate counterbalance of hydraulic pressure and acoustic resonance: the clockwork organs must remain synchronised with the chime of the estate's funeral bell. Dampening the bell-tower clapper or disrupting the mercury feed-lines destabilises the entire manifold.",
        "However, removing Vivienne immediately precipitates an economic and social catastrophe: she is the valley's sole grain creditor and legal buffer against predatory imperial tax-assessors. Striking her down without an alternate administrative plan plunges hundreds of innocent tenant families into winter starvation.",
      ],
    },
    {
      kind: "facts",
      heading: "Villain profile",
      facts: [
        { label: "Archetype", value: "Mastermind / Fallen Matriarch" },
        { label: "Genre", value: "Gothic Horror" },
        {
          label: "World relation",
          value: "Curator (Preserving the past by harvesting the present)",
        },
        { label: "Tone", value: "Tragic & Sinister" },
        {
          label: "Dominant conflict domain",
          value: "Alchemical Obsession / Lineage Preservation",
        },
        {
          label: "Threat scale",
          value: "Regional (Blackwood Valley and surrounding baronies)",
        },
      ],
    },
  ],
  annotation: {
    heading: "Why a villain needs a calendar, not just a lair",
    paragraphs: [
      "The difference between a villain that sits at the end of a dungeon and one that drives a campaign is a calendar. Lady Vivienne Morvath does not wait in her drawing room for adventurers to kick down the doors of Morvath Manor; she has six distinct stages of execution, and each stage changes the world whether the party intervenes or not.",
      "Notice how the lieutenants function as narrative hinges rather than meat-shields. Father Lucian has a crisis of conscience, Mistress Brandt has blackmail journals, and Bailiff Cross is hiding Vivienne's terminal illness. Any one of them can be flipped, interrogated, or exploited to peel back a layer of the mystery without fighting through a fortress.",
      "The moral complication at the end is what keeps the resolution from feeling cheap. Killing Vivienne saves the valley from her mercurial embalming apparatus, but it exposes the tenant farmers to the harsh winter famine and imperial tax-assessors she was holding at bay. That gives the players a genuine governance dilemma to solve once the smoke clears.",
    ],
  },
  relatedGenerators: [
    {
      title: "BBEG / Villain generator",
      description:
        "Generate a campaign-scale antagonist with methods, lieutenants, discovery layers, and an escalating plan. Free, no login.",
      href: "/generators/bbeg-generator",
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
      title: "How do you organise NPC relationships?",
      description:
        "Why lieutenants with conflicting loyalties create better investigation paths than faceless cultists.",
      href: "/answers/how-do-you-organise-npc-relationships",
    },
    {
      title: "How do you run a conspiracy campaign?",
      description:
        "Structuring multi-layered villain agendas that reward player deduction.",
      href: "/answers/how-do-you-run-a-conspiracy-campaign",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Gothic Horror",
      description:
        "Managing tragic curses, decaying estates, and ancestral secrets in dark campaigns.",
      href: "/for/gothic-horror",
    },
  ],
  relatedExamples: [
    "gulls-roost-coastal-smuggling-town",
    "the-low-tide-rust-dock-syndicate",
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2656",
  seo: {
    title:
      "Gothic Horror villain example: Lady Vivienne Morvath | Codex Cryptica",
    description:
      "A campaign-scale Gothic Horror villain with escalating plan stages, discoverable clues, conflicted lieutenants, and a tragic moral dilemma.",
  },
};
