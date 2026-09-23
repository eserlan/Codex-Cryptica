import type { AnswerConfigInput } from "../schema";

export const howDoIRunAJournalistOrMediaCharacterInAnRpg: AnswerConfigInput = {
  slug: "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
  category: "session-prep",
  labels: ["modern", "cyberpunk"],
  publishedAt: "2026-09-23",
  question:
    "How do I make a journalist or Media character matter in an RPG campaign?",
  kind: "framework",
  shortAnswer:
    "An investigator changes what the party knows. A journalist can also change who else knows it, and what they do next. Build play around access, verification, publication, and reaction; the reporter owns what to publish, while the party helps gather evidence, protect sources, and handle the fallout.",
  sections: [
    {
      kind: "prose",
      heading: "A journalist investigates, then changes who knows",
      paragraphs: [
        "An investigator changes what the party knows. A journalist can also change who else knows it, and what they do next. Their work connects sources, evidence, and audiences, then puts the response into play.",
        "This works beyond Cyberpunk RED's Media role. A reporter might risk a source to establish a pattern in investigative horror, draw a witness out in a political campaign, or change whether a neighbourhood trusts its heroes. Keep the system's own rules for contacts, reputation, investigation, and influence. Use this framework to structure choices and consequences.",
      ],
    },
    {
      kind: "list",
      heading: "Use a reporting loop",
      intro:
        "Return to this loop whenever a story develops. It structures scenes and campaign consequences; the game keeps its own mechanics.",
      ordered: true,
      items: [
        {
          term: "Get access",
          text: "Reach a source, document, location, or institution.",
        },
        {
          term: "Establish what is known",
          text: "Separate testimony and evidence from uncertainty.",
        },
        {
          term: "Verify or corroborate",
          text: "Decide what the available evidence can support.",
        },
        {
          term: "Choose what to publish",
          text: "The player decides what to publish, delay, share privately, or withhold.",
        },
        {
          term: "Show who reacts",
          text: "Let audiences, factions, sources, and institutions respond.",
        },
        {
          term: "Turn reaction into play",
          text: "Change access, bring in sources, build pressure, or open and close doors.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Make the reporting process playable",
      intro:
        "Use a few concrete pressures that suit the campaign. Track them in notes or through the rules already in use.",
      items: [
        {
          term: "Access",
          text: "Who will take the character's call, let them through the door, or share a document? Access grows through useful reporting and relationships, and can close when a source is mistreated or an outlet is shut out.",
        },
        {
          term: "Source trust and safety",
          text: "For an important source, note what they know, what they think it means, what they want, what they fear, what could expose them, and what would build or break their trust. A source can be sincere and mistaken; show why they believe their account.",
        },
        {
          term: "Evidence and credibility",
          text: "Separate what the character has heard from what they can substantiate. A recording, a second witness, or a public record may strengthen a story, but proof can be incomplete and each method can create its own risk. Let established evidence remain established even when people dispute its meaning.",
        },
        {
          term: "Deadline and publication",
          text: "An editor, broadcast slot, court hearing, or fast-moving crisis can make timing matter. The player decides whether to publish, wait, protect a source, or share findings privately. Each option should have a plausible cost or opportunity, not a single correct answer the GM expects.",
        },
        {
          term: "Audience and consequence",
          text: "Decide who is likely to hear the story and what they can do with it. Publication might bring a witness forward, damage a reputation, prompt retaliation, open a door, or harden opposition.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make publication a decision, not a victory button",
      paragraphs: [
        "Make the likely stakes legible, then let the player choose whether to publish, wait, narrow the story, share it privately, or withhold it. The reporter owns that editorial decision; the rest of the party can verify evidence, protect sources, secure access, offer expertise, and prepare for the response. A good story changes the situation; it does not end it. It might draw out a witness, trigger an inquiry, provoke retaliation, or open and close access, leaving the group with new choices to face.",
        "People can be wrong, biased, selective, or deceptive; the underlying reality should not move because the players investigated successfully. A witness may describe what they saw accurately but be wrong about who ordered it. Flag uncertainty and give players ways to test claims.",
        "Keep the crew in the story by cutting between the reporter's interviews and the party's other work. A source can send a voice message, an editor can make a demand during another scene, or public reaction can arrive while the party handles the fallout.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the floodgate report",
      paragraphs: [
        "A reporter in a modern conspiracy campaign learns that a contractor concealed cracks in a flood barrier. The evidence points to ignored inspection reports, but the only named source is a maintenance worker whose family lives downstream.",
      ],
      items: [
        {
          term: "The automatic-victory version",
          text: "The reporter publishes the accusation. The contractor confesses, the authorities fix the barrier, and the story ends. The player's choice has no real trade-off, the rest of the party has no part to play, and publication replaces the campaign's conflicts with a convenient GM decision.",
        },
        {
          term: "The consequential-choice version",
          text: "The worker asks not to be named, and the editor wants a publishable account before tomorrow's council vote. The reporter chooses what to do; the party can help secure evidence, protect the source, and prepare for the response.",
        },
        {
          term: "Corroborate before publication",
          text: "Compare inspection dates with a second set of site photographs. The stronger account costs time and may expose the search for evidence.",
        },
        {
          term: "Publish a narrower verified story",
          text: "Report the missing inspections without naming the worker. The claim is safer to support, but the contractor can challenge its scope.",
        },
        {
          term: "Share the documents privately",
          text: "Take them to a councillor who may delay the vote. This could prompt action without a public story, but leaves the councillor to decide what to do next.",
        },
        {
          term: "Publish now",
          text: "Put pressure on the contractor before the vote, while accepting the risk that they identify the source.",
        },
        {
          term: "Consequences and next hooks",
          text: "A narrower story draws a second worker out but gives the contractor time to challenge it. Taking the documents to a councillor may delay the vote, but leaves the next move to them. A public accusation triggers an inquiry while the contractor pressures the editor and tries to discredit the reporter. The facts remain stable; the characters' choices shape who knows them and what happens next.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Journalist and Media character prep checklist",
      items: [
        "What can this character access or make public that the rest of the party cannot?",
        "Who is their source, what do they want, and what would identifying them put at risk?",
        "What is known, what is supported by evidence, and what remains uncertain?",
        "Who is the audience, and which people or factions might respond to publication?",
        "What meaningful choices exist besides publishing everything immediately?",
        "How can the other characters gather proof, protect people, obtain access, or handle fallout?",
        "Can this session's reporting happen inside shared scenes rather than a string of isolated interviews?",
        "Have you made misinformation testable without changing established facts or overruling the player's decision?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep sources and stories connected",
    paragraphs: [
      "A source, an editor, a document, and the faction responding to a story can all remain connected as campaign records. That makes it easier to remember who knows what and bring a publication's consequences back in a later session.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedForPages: [
    {
      title: "Codex Cryptica for investigative campaigns",
      description:
        "Keep witnesses, evidence, outlets, and factions connected across a long-running investigation.",
      href: "/for/conspiracy",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
    "how-do-i-give-specialist-characters-spotlight",
    "what-rpg-should-i-play-for-investigative-horror",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-i-run-political-intrigue-and-faction-play",
    "how-to-write-an-in-world-newspaper-for-an-rpg",
    "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
  ],
  discovery: {
    id: "answer-journalist-media-character-rpg",
    parentCluster: "specialist-characters",
    primaryIntent: "how to run a journalist character in an rpg campaign",
    intentAliases: [
      "how do i make a journalist character matter in an rpg",
      "how to gm a reporter character",
      "how to make the media role useful in cyberpunk red",
      "journalism in an rpg campaign",
      "how to run a cyberpunk red media character",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A cross-genre GM framework for making journalism distinct from clue-finding through access, source trust, evidence, publication choices, and audience consequences, with player agency, fair uncertainty, whole-party participation, a worked example, and a prep checklist.",
    relatedIntents: [
      "answer-specialist-character-spotlight",
      "answer-cyberpunk-party-roles",
      "answer-conspiracy-campaign",
      "answer-run-political-intrigue",
      "answer-investigative-horror-system-selection",
      "answer-run-hackers-netrunners",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The spotlight answer gives reusable scene structures for any specialist; this answer focuses specifically on journalism's sources, public credibility, publication decisions, and consequences across genres.",
      },
      {
        with: "answer-cyberpunk-party-roles",
        reason:
          "The cyberpunk roles answer briefly situates a journalist among a specific crew; this answer is the detailed, cross-genre guide to reporting, source protection, publication agency, and public influence.",
      },
      {
        with: "answer-conspiracy-campaign",
        reason:
          "The conspiracy answer structures a campaign's underlying truth and evidence trail; this answer addresses the player character's reporting process and the consequences of making findings public.",
      },
      {
        with: "answer-run-political-intrigue",
        reason:
          "The political intrigue answer runs competing faction agendas; this one treats journalism as a specialist role that can change what the public and factions know without replacing faction play.",
      },
      {
        with: "answer-investigative-horror-system-selection",
        reason:
          "The investigative horror answer compares systems; this answer offers GM techniques for a journalist PC that can be used with any system or genre.",
      },
      {
        with: "answer-run-hackers-netrunners",
        reason:
          "The hacker answer keeps digital specialist scenes connected to group action; this answer focuses on source relationships, publication, public credibility, and story consequences.",
      },
    ],
  },
  seo: {
    title:
      "How to run a journalist or Media character in an RPG | Codex Cryptica",
    description:
      "Make an RPG journalist matter through sources, credibility, publication choices, audience consequences, and shared party action. Includes a worked example and GM checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-journalist-or-media-character-in-an-rpg.jpg",
    imageAlt:
      "A journalist reviewing evidence and protecting a source before publication",
  },
};
