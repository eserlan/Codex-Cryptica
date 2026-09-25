import type { AnswerConfigInput } from "../schema";

export const howDoIExpandASimpleRpgCampaignIdea: AnswerConfigInput = {
  slug: "how-do-i-expand-a-simple-rpg-campaign-idea",
  category: "session-prep",
  publishedAt: "2026-09-20",
  question: "How do I expand a simple RPG campaign idea?",
  kind: "framework",
  shortAnswer:
    "Expand outward from the original idea through relationships and consequences, and skip the encyclopaedia. Ask what tension sits at the centre, who gains from it, who is hurt by it, what everyone believes that may be wrong, what changed recently, and what happens if nobody acts. Then choose three people, places or things that make the idea tangible at the table, and leave the deeper answers as questions for play to settle.",
  sections: [
    {
      kind: "prose",
      heading: "Depth comes from connections, not volume",
      paragraphs: [
        "A single sentence, a striking image or a villain with a gimmick is a fine starting point. The usual mistake is to treat it as a request for lore: a founding myth, a calendar, a map of neighbouring kingdoms. That produces a lot of text the players will never meet, and it can bury the thing you liked about the idea in the first place.",
        "A more useful kind of depth is the kind the players can bump into. Give the idea a few people with different interests in it, something that has recently gone wrong, and a few visible details at the table. Every addition should attach to the original sentence, so the idea grows without turning into something else.",
      ],
    },
    {
      kind: "list",
      heading: "Eight questions to ask the idea",
      intro:
        "You do not need all eight answered before you play. Work down the list until the idea feels solid enough to run, and note only what you decide.",
      items: [
        {
          term: "What is the central question or tension?",
          text: "State the one thing that makes the idea interesting: a contradiction, a secret or a strain. Everything else should point back to it.",
        },
        {
          term: "Who benefits from the situation as it stands?",
          text: "Find the people or groups who would be worse off if it changed. They will defend it, and they give the party someone to bargain with or push against.",
        },
        {
          term: "Who is harmed by it, or wants it changed?",
          text: "This is the opposite pressure. A benefit with nobody on the other side is decoration.",
        },
        {
          term: "What does everyone believe that may be wrong?",
          text: "A shared assumption that could be false is one of the easiest useful secrets to write. It gives you a discovery to hold in reserve.",
        },
        {
          term: "What changed recently?",
          text: "The idea has probably been stable for years, so pick a reason it is under strain now.",
        },
        {
          term: "What happens next if nobody intervenes?",
          text: "Write one or two sentences. This is what the world does while the players are busy elsewhere.",
        },
        {
          term: "What three people, places or things make it tangible?",
          text: "Choose three you can describe in a line each and put in front of the players in the first session. Three is a suggestion, and a small number keeps you from overpreparing.",
        },
        {
          term: "What rumours, clues or visible consequences point to the deeper situation?",
          text: "Decide what the players can notice without asking the right question: a price that has doubled, a locked door, a story that two people tell differently.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: from a seed to a table-ready idea",
      paragraphs: [
        "The seed is a single line: a town built from dragon bones. Here is how it grows without ceasing to be that town.",
      ],
      items: [
        {
          term: "Why the bones matter",
          text: "Carved bone is the only material that survives the salt wind, so everything the town sells or lives in depends on it. The central tension is that the town is wealthy and nobody can say what happened to the dragons.",
        },
        {
          term: "Who controls them, and who resents it",
          text: "Three families of carvers hold the licences to cut, and they set the price. Fishing crews and newcomers must buy bone or go without, and they resent how tightly the families hold the trade.",
        },
        {
          term: "What people believe, and what changed",
          text: "Everyone repeats the story that the dragons died in an old war and were left where they fell. Recently a carver found a bone that was cut cleanly with a tool, long before anyone lived here, and has told only her sister.",
        },
        {
          term: "What the players meet first",
          text: "A carvers' market where bone prices have jumped after a licence increase, a chapel built inside a ribcage that people avoid, and a fisher who sells a bone fragment she says was not dug from the town's quarry.",
        },
        {
          term: "What stays open",
          text: "Who cut the bone, and why the families would want it kept quiet. Leave these as questions and let the party's choices decide which answers matter.",
        },
        {
          term: "Why it works",
          text: "The result is still recognisably a town built from dragon bones. Every detail attaches to the seed, and the additions are relationships and pressures rather than history the players have to read.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Expanding an idea is not outlining a campaign",
      paragraphs: [
        "You do not need to plan a campaign from beginning to end. Once several people want incompatible things and the situation keeps changing without the players, you have something that can produce several adventures: factions react, consequences create new problems, and the questions you left open become arcs when the party goes looking. Add new places and characters only as play reaches them, and expand again when the table shows which direction matters.",
        "This page deepens the situation with people, tensions, beliefs and consequences. Turning that situation into a session, with an opening scene, hooks, obstacles and stakes, is a separate job.",
      ],
      cta: {
        text: "Read how to turn an RPG idea into an adventure",
        href: "/answers/how-do-i-turn-an-rpg-idea-into-an-adventure",
      },
    },
    {
      kind: "checklist",
      heading: "Before you stop expanding",
      intro: "Check your notes against these:",
      items: [
        "Can you state the central tension in one sentence?",
        "Is there at least one person who gains and one who is harmed?",
        "Have you written one belief that might be false?",
        "Do you know what changed recently and what happens if nobody acts?",
        "Have you chosen a few tangible things to show in the first session?",
        "Could a player notice the deeper situation without asking the right question?",
        "Does every addition connect back to the original idea?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping an expanded idea connected",
    paragraphs: [
      "As an idea grows, the people, places and beliefs you add need to stay linked to the seed and to each other. In Codex Cryptica you can save the town, the carver families, the fisher and the bone that was cut with a tool as entities, and connect them so you can see who is touched by each new discovery.",
      "The generators can supply a missing piece without replacing what you have: a faction for the licensing families, rumours that tell the same event two ways, a settlement for a nearby place, or a secret to sit behind the shared belief. Keep what fits your idea and drop the rest.",
    ],
    linkText: "Develop your idea with the adventure generator",
    href: "/generators/adventure-generator",
  },
  relatedTools: [
    {
      title: "Adventure generator",
      description:
        "Adventure concepts with an opening situation, stakes and opposition to build on your seed.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Faction generator",
      description:
        "Groups with competing interests, for the people who gain from and resent the situation.",
      href: "/generators/faction",
    },
    {
      title: "Rumour generator",
      description:
        "Conflicting accounts of one event, for clues that hint at the deeper situation.",
      href: "/generators/rumour",
    },
    {
      title: "Settlement generator",
      description:
        "Places with people and pressures attached, for locations near your idea.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Characters with goals and secrets, for the people who make the idea tangible.",
      href: "/generators/npc",
    },
    {
      title: "Secret society generator",
      description:
        "Hidden groups with agendas, for what sits behind a belief everyone shares.",
      href: "/generators/secret-society",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Keep situations, factions and consequences connected as the players make their own choices.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "is-my-rpg-campaign-idea-good",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-create-a-fantasy-faction",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-i-prepare-an-rpg-session-step-by-step",
  ],
  discovery: {
    id: "answer-expand-simple-rpg-campaign-idea",
    parentCluster: "adventure-design",
    primaryIntent: "how to expand a simple rpg campaign idea",
    intentAliases: [
      "how to expand a dnd campaign idea",
      "how to develop an rpg idea",
      "how to flesh out a campaign idea",
      "how to turn a simple idea into a campaign",
      "i only have one small rpg idea",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Starts from a very small seed such as one sentence or image and expands it through relationships, beliefs and consequences instead of lore, keeping the result recognisably the user's own idea.",
    relatedIntents: [
      "answer-is-my-rpg-campaign-idea-good",
      "answer-turn-rpg-idea-into-adventure",
      "generator-adventure-generator",
      "generator-adventure-idea-generator",
      "answer-run-factions-sandbox",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-turn-rpg-idea-into-adventure",
        reason:
          "This page grows a tiny seed into enough material to run; the other page is the procedure for turning a developed idea into a playable situation.",
      },
    ],
  },
  seo: {
    title: "How do I expand a simple RPG campaign idea? | Codex Cryptica",
    description:
      "Expand a one-line RPG or D&D idea without a lore dump: eight questions on tension, beliefs and consequences, plus a worked example and a checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-expand-a-simple-rpg-campaign-idea.jpg",
    imageAlt:
      "A game master's notebook open to a single sentence with branching sketches of a bone-walled town, carver's tools and small tokens beside a lantern",
  },
};
