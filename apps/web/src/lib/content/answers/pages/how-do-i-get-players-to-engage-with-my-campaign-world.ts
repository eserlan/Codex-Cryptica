import type { AnswerConfigInput } from "../schema";

export const howDoIGetPlayersToEngageWithMyCampaignWorld: AnswerConfigInput = {
  slug: "how-do-i-get-players-to-engage-with-my-campaign-world",
  category: "session-prep",
  publishedAt: "2026-08-31",
  question: "How do I get players to engage with my campaign world?",
  kind: "framework",
  shortAnswer:
    "Players engage with lore when it does something to their characters, not when it's explained to them. A piece of history becomes interesting the moment it can be wanted, feared, changed, lost or exploited. The fix is rarely 'more worldbuilding' or 'better exposition'; it's turning what already exists into choices, connecting it to what the characters already want, and letting player decisions visibly move it. And roleplaying isn't the same thing as performing dialogue in character: a player making a sharp decision in third person is roleplaying just as much as one doing voices.",
  sections: [
    {
      kind: "prose",
      heading: "The problem usually isn't the lore",
      paragraphs: [
        "A common but wrong diagnosis: the players are passive because the setting isn't interesting enough, so the fix is a longer handout, a richer history, a deeper explanation next session. This almost never works, because the lore was never the thing missing; a mechanism for the players to act on it was.",
        "History, factions and NPCs earn attention by mattering to a decision in front of the party right now, not by being well-written on the page. A noble feud nobody can affect is background noise no matter how good the prose is; the same feud with a stake in tonight's scene is instantly interesting.",
      ],
    },
    {
      kind: "list",
      heading: "Turning lore into something players act on",
      items: [
        {
          term: "Convert exposition into choices",
          text: "Instead of explaining a faction's history, put the party in a scene where that history forces a decision: who to trust, what to reveal, which side to be seen helping.",
        },
        {
          term: "Connect the world to PC goals and backstories",
          text: "An NPC, faction or location gets attention fastest when it touches something a character already wants or already has a stake in. Reuse what's on the character sheet before inventing something new.",
        },
        {
          term: "Make consequences visible",
          text: "When a decision changes something (a faction's stance, a location's fate, an NPC's trust), show that change on screen. Consequences the players never see might as well not exist.",
        },
        {
          term: "Bring things back",
          text: "A callback to an earlier choice does more for investment than almost any amount of new material. The NPC they spared, the debt they left unpaid, the faction they snubbed: these are free engagement if you're tracking them.",
        },
        {
          term: "Give NPCs clear wants",
          text: "A want is what makes an NPC useful in a scene the players didn't script: it tells you what that NPC does when the party surprises them, and gives players something to negotiate with or against.",
        },
        {
          term: "Use rumours, invitations and threats instead of lore dumps",
          text: "A rumour that might be false, an invitation with a catch, a threat with a deadline: these all deliver the same setting information as a lore dump, but arrive as something to act on rather than something to absorb.",
        },
        {
          term: "Offer several hooks and watch what gets pursued",
          text: "Rather than guessing what the table cares about, offer more than one thread and notice which one they actually chase. That's more reliable information than asking them directly.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Roleplaying isn't the same as performing",
      paragraphs: [
        "A player who says 'I'd never abandon her, I'm going back for the hostage even if it costs us the vault' is roleplaying just as fully as a player doing an accent and staying in first person for twenty minutes. Judging engagement by how much anyone performs filters out players who express character through decisions rather than voice work, and it's a fast way to make a quieter player feel like they're doing it wrong.",
        "It's also fine, not a failure state, that not every player wants the same depth of lore engagement. Some want to drive plot, some want tactical combat, some are there for the company and take the world as a backdrop. The goal is to create real opportunities to engage, not to compel enthusiasm nobody at the table actually has. Give quieter players meaningful decisions that don't require being put on the spot (a private note, a choice with no audience, a consequence that lands on their character specifically) rather than measuring engagement by how much anyone volunteers out loud.",
      ],
    },
    {
      kind: "example",
      heading: "Turning an inert fact into something players act on",
      paragraphs: [
        "The same piece of history, before and after it's connected to the table.",
      ],
      items: [
        {
          term: "Weak: exposition",
          text: "A two-paragraph handout on the decades-old feud between House Alder and House Vance: well-written, entirely inert. Nobody at the table has a reason to care which house wins.",
        },
        {
          term: "Stronger: a stake in tonight",
          text: "One PC's patron belongs to House Alder. The innkeeper the party trusts is secretly feeding information to House Vance. Tonight, both houses want the same witness found first, and the party is standing between them.",
        },
        {
          term: "Why it works",
          text: "Nothing about the feud's history changed. What changed is that a PC now has a side, a trusted NPC now has a secret the party could discover, and the party has to decide something before the scene ends: which house, if either, they help.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica handles this",
    paragraphs: [
      "The technique above depends on actually being able to find the callback later: the NPC's want, the faction's current stance, the debt from three sessions ago. A vault where NPCs, factions and locations are connected entities rather than paragraphs in a document makes that lookup fast enough to use mid-session, which is the difference between a callback happening and an opportunity for one quietly slipping away.",
      "Contextual generators and the Oracle can help surface a plausible next want or connection when you need one on the spot, drawing on what's already recorded in the vault rather than inventing detail that contradicts it. None of this replaces noticing what your specific table actually pursues; that's still a judgement call only the GM running the table can make.",
    ],
    linkText: "See the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Where NPC wants, faction stances and past-session consequences live as connected entities, so a callback is a lookup rather than a memory test.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "Faction generator",
      description:
        "A fast way to give a faction the wants and relationships that make it something players can push against.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-npc-relationships",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-create-a-fantasy-faction",
    "how-do-i-run-a-successful-session-0",
    "what-should-i-look-for-in-an-rpg-campaign-manager",
  ],
  discovery: {
    id: "answer-player-engagement",
    parentCluster: "player-engagement",
    primaryIntent: "how to increase player engagement with an rpg campaign",
    intentAliases: [
      "how do i get players to engage with my campaign world",
      "how to get players to roleplay",
      "how to make players care about the world",
      "how to get players invested in the campaign",
      "passive rpg players",
      "players ignore my lore",
    ],
    uniqueValue:
      "Reframes engagement as a mechanism problem, not a content problem: lore becomes interesting once it's a choice, a stake or a callback, and separates roleplaying from in-character performance so quieter players aren't judged as disengaged.",
    relatedIntents: [
      "answer-npc-relationships",
      "answer-campaign-notes",
      "answer-fantasy-faction",
      "answer-session-zero",
    ],
  },

  seo: {
    title:
      "How do I get players to engage with my campaign world? | Codex Cryptica",
    description:
      "Lore becomes interesting when players can act on it. A framework for turning exposition into choices, plus a before/after example and why roleplaying isn't the same as performing.",
  },
};
