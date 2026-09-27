import type { AnswerConfigInput } from "../schema";

export const whatDoYouDoWithMurderHobosInAnRpgCampaign: AnswerConfigInput = {
  slug: "what-do-you-do-with-murder-hobos-in-an-rpg-campaign",
  category: "session-prep",
  publishedAt: "2026-09-27",
  question: "What do you do with murder hobos in your RPG campaign?",
  kind: "framework",
  shortAnswer:
    "First check whether murder hobo behaviour is actually a problem: if everyone at the table enjoys a violent, chaotic playstyle, there is nothing to fix. A violent character can still be played cooperatively; the concern is whether the player's choices repeatedly break agreed expectations, limit other players' agency, or make the game less enjoyable. Address a mismatch out of game, while letting proportionate in-fiction consequences follow from the established world. Escalating with tougher enemies to punish the behaviour treats a table disagreement as a combat problem and usually makes it worse.",
  sections: [
    {
      kind: "prose",
      heading: "The term covers two different things",
      paragraphs: [
        '"Murder hobo" gets used for any character who fights readily, but that alone is not the issue. A fighter who kills bandits during a fight the table chose to have is playing a combat-capable character, not causing a problem. A character can be cruel, reckless, or violent while the player supports everyone\'s fun.',
        "The behaviour worth addressing is a pattern that clashes with what the group agreed to play: for example, repeatedly killing neutral or surrendered NPCs when other players want to talk, investigate, or make moral choices. The character's fictional morality is not the test. Ask whether the player's choices override shared expectations, other players' choices, the agreed tone, or consent around conflict within the party.",
      ],
    },
    {
      kind: "list",
      heading:
        "Decide whether there is a problem before you decide what to do about it",
      intro: "Ask these before changing anything at the table:",
      items: [
        {
          term: "Is anyone losing agency or enjoyment",
          text: "Did another player lose a meaningful scene or character niche? Is the behaviour making someone uncomfortable or frustrated, or repeatedly working against shared party goals? Those are table-impact questions, even if the campaign can adapt easily.",
        },
        {
          term: "Does it fit the agreed tone and boundaries",
          text: "A grimdark mercenary campaign and a cosy village mystery have different defaults for what a character does to an NPC who annoys them. Check the mismatch against what the table agreed, including any boundaries around intra-party conflict, rather than your own preference.",
        },
        {
          term: "Can the scenario adapt if an NPC is lost",
          text: "If an informant dies or a faction becomes hostile, look for other witnesses, clues, or routes forward. A campaign that adapts easily has avoided plot damage; that does not answer whether the behaviour is costing other players agency, comfort, or enjoyment.",
        },
        {
          term: "Is it working against shared party goals",
          text: "One player built a character around talking their way past a guard captain. Another kills the captain before the conversation starts. If this repeatedly denies a scene that another player wants to play, discuss that cost together.",
        },
        {
          term: "Is it a pattern or a session",
          text: "One bad night, a rough combat, a player blowing off steam, is not the same as a standing habit that shows up every session regardless of context.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Talk outside the game first",
      paragraphs: [
        "If the answer to the checklist is genuinely yes, the fix starts as a conversation, not a scene. Trying to teach a lesson through the fiction, an angry mob, a curse, a captured character, treats an out-of-game disagreement as if it were an in-game event, and the player usually reads it correctly as the GM punishing them rather than the world reacting.",
        "A short, direct conversation outside the session works better precisely because it is honest about what is happening: the table has a mismatch, and it needs sorting between people, not between a character and an NPC.",
      ],
      cta: {
        text: "Read how to run a successful Session 0",
        href: "/answers/how-do-i-run-a-successful-session-0",
      },
    },
    {
      kind: "list",
      heading: "What to re-establish in that conversation",
      intro:
        "Session 0 usually covers this once. A murder hobo conversation is where you check it still holds:",
      items: [
        {
          term: "Campaign tone",
          text: "What kind of consequences the world hands out for casual violence, and whether that has actually been consistent so far.",
        },
        {
          term: "NPC treatment",
          text: "What level of violence toward neutral, surrendered, helpless, or socially important NPCs fits the campaign everyone agreed to play.",
        },
        {
          term: "PvP and party goals",
          text: "Whether the party is meant to be pulling in the same direction, and what happens when one character's choices work against the others' goals.",
        },
        {
          term: "Character concept fit",
          text: "Whether the character as built can actually operate inside the campaign the table agreed to run, or whether the concept and the campaign are pulling apart.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Use consequences that fit the established world",
      paragraphs: [
        "Use consequences that follow from the established world, not consequences invented mainly to punish the player. Witnesses may report a killing, allies may lose trust, local law may investigate, or a victim's associates may react. These consequences can happen as soon as the world would respond; the out-of-game conversation is still needed to address a mismatch at the table. What follows depends on witnesses, local law, the victim's status, faction ties, who cares, and whether anyone can act on what happened. Not every violent act needs a bounty, a revenge squad, or an escalating combat response.",
        "The common advice to just send stronger guards or bounty hunters after them treats the disagreement as a combat encounter to win. It rarely lands that way. The player either fights through the escalation, which confirms the campaign is now about them versus the world, or the table spends a session on a fight that exists only to make a point that was never about combat in the first place.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a character keeps killing captured enemies",
      paragraphs: [
        "An investigation into bandit raids has several routes forward: a captured bandit may talk, but the party can also follow tracks, study a map or insignia, find stolen orders, hear from another witness, or learn from the faction's reaction. A player's character has executed three surrendered bandits across two sessions. The investigation can adapt, but the table has agreed that captives, interrogation, and moral choices are part of the campaign, and other players are losing scenes they want to play.",
      ],
      items: [
        {
          term: "The escalation response",
          text: "The GM has the next bandit group ambush the party with twice the numbers and a captured NPC as a hostage, hoping the stakes teach the player to value prisoners. The player reads it as the world turning hostile because the GM disapproves, and the campaign becomes a string of harder fights instead of the investigation it was meant to be.",
        },
        {
          term: "The conversation-first response",
          text: "The GM talks to the player outside the session: the investigation has other leads, but the repeated executions are shutting down scenes the rest of the group wants to play after agreeing that captives and their choices matter. They agree how the character can remain violent while leaving room for those scenes. The GM can still let witnesses, local law, or the bandits' allies respond in ways that fit the setting.",
        },
        {
          term: "Why it works",
          text: "The investigation does not depend on one prisoner, and the conversation addresses the actual problem: a repeated choice is denying other players scenes they agreed to share. The character can remain violent without overriding the group's expectations, and consequences need not become an arms race.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "If one player keeps ignoring the agreement",
      intro:
        "Work through this in order rather than jumping straight to the last step:",
      items: [
        "Restate the specific issue privately and plainly, not as a general complaint about playstyle.",
        "Agree on one concrete change you can both check for in the next session.",
        "If the pattern continues, revisit whether the character concept actually fits the campaign, and whether it can be adjusted.",
        "If the behaviour still continues after that, recognise that the player and this particular campaign may not be a good fit, which is a real outcome, not a failure to fix them.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping consequences connected to what actually happened",
    paragraphs: [
      "Believable consequences depend on remembering what a character actually did to whom, not on inventing a punishment after the fact. Codex Cryptica's campaign graph keeps every NPC, faction, and killed or spared character as a connected entity, so a guard captain's memory of a specific killing, or a faction's growing distrust after a string of incidents, is something you can look up rather than reconstruct from memory.",
      "The Faction generator can also build out witnesses, allies, rivals, victims, or informant networks, with motives and relationships that can shape believable consequences. Alternative witnesses and information routes let an investigation adapt if one NPC disappears, while any response still depends on what the established world would do.",
    ],
    linkText: "Explore the Codex Cryptica campaign graph",
    href: "/for/sandbox-campaigns",
  },
  relatedTools: [
    {
      title: "Faction generator",
      description:
        "Build the guards, bounty hunters, or factions that plausibly respond to a party's actions, with a concrete want attached.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Generate NPCs with motives worth engaging with, from witnesses and allies to rivals and victims whose relationships can shape what happens next.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Track how NPCs, factions, and consequences connect across a player-directed campaign.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-a-successful-session-0",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-much-rule-of-cool-should-a-dm-allow",
  ],
  discovery: {
    id: "answer-murder-hobos-in-rpg-campaign",
    parentCluster: "table-management",
    primaryIntent: "what to do with murder hobos in an rpg campaign",
    intentAliases: [
      "how to deal with murder hobos",
      "murder hobo player",
      "how to stop murder hobos",
      "players kill every npc",
      "players attack everyone in dnd",
    ],
    userJob: "understand",
    uniqueValue:
      "Separates a genuinely disruptive playstyle from a chaotic-but-fun one before recommending any fix, and treats the actual fix as an out-of-game conversation and Session 0 realignment first, with in-fiction consequences following naturally from what happened rather than escalating as GM punishment.",
    relatedIntents: [
      "answer-session-zero",
      "answer-players-going-off-script",
      "answer-how-much-rule-of-cool-should-a-dm-allow",
      "for-sandbox-campaigns",
    ],
  },
  seo: {
    title:
      "What do you do with murder hobos in your RPG campaign? | Codex Cryptica",
    description:
      "Tell a real problem from harmless chaos, fix murder hobo behaviour with an out-of-game talk and a Session 0 reset, and use believable consequences instead of escalating.",
    image:
      "https://assets.codexcryptica.com/og/what-do-you-do-with-murder-hobos-in-an-rpg-campaign.jpg",
    imageAlt:
      "A grim adventurer standing over fallen foes in a torch-lit village square while wary townsfolk watch from doorways",
  },
};
