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
    "Give a journalist more to do than find clues: make access, source trust, credibility, deadlines and audience shape what they can learn and publish. Let a story change how people act, but make publication a consequential choice rather than an automatic victory. Keep the player in control of what their character reports, involve the whole party in gathering and protecting evidence, and let different accounts conflict without making the facts arbitrary.",
  sections: [
    {
      kind: "prose",
      heading: "A journalist investigates, then changes who knows",
      paragraphs: [
        "An investigator asks what happened. A journalist or Media character also asks who will believe it, who can be reached, what can be proved, and what publication will do. Their distinctive power is not simply access to clues: it is the ability to make information public, connect people who would otherwise remain isolated, and force powerful groups to answer. That influence is never a universal mind-control ability. A true story can be ignored, contested, delayed, or used by someone with a different agenda.",
        "This works beyond cyberpunk RED's Media role. In investigative horror, a reporter may risk a source to establish a pattern. In a modern or political campaign, an exposé may shift a public meeting or draw a witness out of hiding. In a superhero game, footage can change whether a neighbourhood trusts the heroes. Keep the system's own rules for contacts, reputation, investigation, and social influence; use the structures here to make their consequences visible rather than adding a new universal subsystem.",
      ],
    },
    {
      kind: "list",
      heading: "Make the reporting process playable",
      intro:
        "Use a few concrete pressures that suit the campaign. Track them in notes or through the rules already in use; do not turn every story into a second character sheet.",
      items: [
        {
          term: "Access",
          text: "Who will take the character's call, let them through the door, or share a document? Access grows through useful reporting and relationships, and can close when a source is mistreated or an outlet is shut out.",
        },
        {
          term: "Source trust and safety",
          text: "Record what a source knows, what they want, what they fear, and what identifying them could cost. A source can be sincere and still mistaken; show why they believe their account rather than using unreliability as a surprise punishment.",
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
          text: "Decide who is likely to hear the story and what they can do with it. Publication might bring a witness forward, damage a reputation, prompt a faction to retaliate, open a door, or harden opposition. The response follows from the people and institutions involved, not from a guaranteed universal reach score.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make truth a decision, not a victory button",
      paragraphs: [
        "A consequential story presents choices: publish a well-supported account that identifies a vulnerable source, hold it until corroboration arrives, release a narrower version, or take the evidence to someone who can act without broadcasting it. The GM should make the likely stakes legible, then let the player choose. Do not require the journalist to publish every discovery, and do not make publication itself resolve the central problem. It can change the public situation while leaving the party with hard work to do.",
        "Use sources with competing interests, not a hidden answer key. One witness may accurately describe what they saw but be wrong about who ordered it; a company spokesperson may state a true fact while omitting its context. Keep the underlying facts consistent, flag uncertainty, and give players ways to test claims. Misinformation is fair when its origin and telltale limits can be investigated, not when the GM changes reality to defeat a successful investigation.",
        "Keep the crew in the story. Other characters can verify records, negotiate access, protect a source, check a location, provide expertise, or plan for the response. Cut between those actions and the reporter's interviews. Not every session needs a private interview: a source can send a voice message, an editor can make a demand during another scene, and a public reaction can arrive while the party is already dealing with the fallout.",
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
          text: "The group can corroborate the worker's account by comparing public inspection dates with a second set of site photographs. The worker asks not to be named; the reporter's editor wants a publishable account before a council vote tomorrow. The party can protect the worker while seeking another source, publish a narrower story about the missing inspections, take the documents to a councillor who may delay the vote, or publish now and accept that the contractor will know where the leak came from. Each path changes who can act and what risks follow. The reporter decides what to publish; the others help secure evidence, protect the source, or prepare for the response.",
        },
        {
          term: "Consequences and next hooks",
          text: "A narrower story draws a second worker out but gives the contractor time to challenge the evidence. A protected source keeps their job for now and asks the party for help moving a copy of the records. A public accusation triggers an inquiry while the contractor pressures the editor and tries to discredit the reporter. The facts remain stable; the characters' choices shape who knows them and what happens next.",
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
