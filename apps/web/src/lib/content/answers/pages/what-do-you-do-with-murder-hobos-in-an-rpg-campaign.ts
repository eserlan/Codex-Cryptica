import type { AnswerConfigInput } from "../schema";

export const whatDoYouDoWithMurderHobosInAnRpgCampaign: AnswerConfigInput = {
  slug: "what-do-you-do-with-murder-hobos-in-an-rpg-campaign",
  category: "session-prep",
  publishedAt: "2026-09-27",
  question: "What do you do with murder hobos in your RPG campaign?",
  kind: "framework",
  shortAnswer:
    "First check whether murder hobo behaviour is actually a problem: if everyone at the table enjoys a violent, chaotic playstyle, there is nothing to fix. If it is derailing the campaign or draining other players' fun, address it out of game first, restate what the table agreed the campaign is about, and only then let believable in-fiction consequences, guards, witnesses, bounties, follow from what already happened. Escalating with tougher enemies to punish the behaviour treats a table disagreement as a combat problem and usually makes it worse.",
  sections: [
    {
      kind: "prose",
      heading: "The term covers two different things",
      paragraphs: [
        '"Murder hobo" gets used for any character who fights readily, but that alone is not the issue. A fighter who kills bandits during a fight the table chose to have is playing a combat-capable character, not causing a problem.',
        "The behaviour worth addressing is different: killing NPCs who posed no threat, attacking shopkeepers or informants the party needed alive, or treating every scene as a prompt for violence regardless of what the group set out to do. The distinction is not how much a character fights. It is whether the choices are closing off the story other players are trying to tell.",
      ],
    },
    {
      kind: "list",
      heading:
        "Decide whether there is a problem before you decide what to do about it",
      intro: "Ask these before changing anything at the table:",
      items: [
        {
          term: "Is the campaign actually derailing",
          text: "A dead informant who cannot be replaced, a burned bridge with the one faction the party needed, a plot thread that has nowhere left to go. If the story still has places to go, this is colour, not damage.",
        },
        {
          term: "Is anyone else losing their scene",
          text: "One player built a whole character around talking their way past a guard captain. Another player kills the guard captain before the conversation starts. That is a cost paid by someone else at the table, not by the player who chose it.",
        },
        {
          term: "Does it match the tone everyone signed up for",
          text: "A grimdark mercenary campaign and a cosy village mystery have different defaults for what a character does to an NPC who annoys them. Check the mismatch is real, not just a difference from your own preference.",
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
          text: "Which NPCs the campaign needs alive to keep functioning, and why, not as a blanket rule against violence.",
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
      heading: "Let consequences come from the fiction, not from you",
      paragraphs: [
        "Once the conversation has happened, in-world consequences are still fair game, guards who remember a face, a bounty posted in the next town, a faction that hears what happened and stops trusting the party. The difference is that these follow from what the characters actually did, at a scale the world would plausibly produce, rather than being scaled up specifically to punish the player.",
        "The common advice to just send stronger guards or bounty hunters after them treats the disagreement as a combat encounter to win. It rarely lands that way. The player either fights through the escalation, which confirms the campaign is now about them versus the world, or the table spends a session on a fight that exists only to make a point that was never about combat in the first place.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a character keeps killing captured enemies",
      paragraphs: [
        "A player's character has killed three surrendered bandits across two sessions, each time cutting off a lead the GM had planned to use, a name, a hideout location, a reason the raids started.",
      ],
      items: [
        {
          term: "The escalation response",
          text: "The GM has the next bandit group ambush the party with twice the numbers and a captured NPC as a hostage, hoping the stakes teach the player to value prisoners. The player reads it as the world turning hostile because the GM disapproves, and the campaign becomes a string of harder fights instead of the investigation it was meant to be.",
        },
        {
          term: "The conversation-first response",
          text: "The GM talks to the player outside the session: the investigation needs at least some prisoners alive to go anywhere, and every surrendered enemy killed removes a lead with nothing replacing it. They agree the player's character can still be lethal in a fight, just not to someone who has already surrendered. In the next session, a bandit who does get taken alive gives up the location the GM had been waiting to reveal.",
        },
        {
          term: "Why it works",
          text: "The fix addressed the actual problem, leads disappearing, directly, and let the character stay violent where it did not cost the table anything. Nothing had to escalate for the point to land.",
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
      "The Faction generator can also build out the guards, bounty hunters, or informant networks a consequence needs, with a want and a grievance already attached, so the response reads as the world reacting rather than the GM inventing an obstacle on the spot.",
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
        "Generate the NPCs a campaign needs to keep functioning, with motives worth protecting rather than discarding.",
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
