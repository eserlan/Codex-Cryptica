import type { AnswerConfigInput } from "../schema";

export const howToAdaptAVideoGameIntoATabletopRpg: AnswerConfigInput = {
  slug: "how-to-adapt-a-video-game-into-a-tabletop-rpg",
  category: "adventure-design",
  publishedAt: "2026-10-24",
  question:
    "How do I turn a single-player video game into a tabletop RPG campaign?",
  kind: "how-to",
  shortAnswer:
    "Keep the setting, conflicts, factions and atmosphere that make the game worth visiting, but give the original hero's important choices to the player characters. The protagonist can be absent, missing, a legend, a rival or a supporting character; what they must not do is solve the central problem while the party watches. Adapt the game's possibilities, not its walkthrough: turn scripted quests into open problems, split the hero's jobs between the party, and let the ending differ from the one on screen.",
  sections: [
    {
      kind: "prose",
      heading: "The problem is one hero, not the setting",
      paragraphs: [
        "A story-driven single-player game organises everything around one predefined person. That character finds the clues, wins the trust of key factions, carries the special knowledge and makes the final decision. A tabletop party of three to five player characters (PCs) cannot share that role by taking turns to watch. If the original hero keeps the decisive moments, the PCs become escorts in someone else's story.",
        "The fix is a transfer of agency, not a bigger cast. Before you convert any quest, list what the hero actually does in the story: who they meet, what they alone can learn, which groups they unite or betray, and what they decide at the end. Those verbs belong to the party now. Places, factions, dangers and mood can stay close to the source. The sequence of required scenes cannot.",
      ],
    },
    {
      kind: "list",
      heading: "Decide what to do with the original protagonist",
      intro:
        "Pick one treatment before session zero and tell the players which one you have chosen, even if their characters do not know it yet. Each option below works under a different condition:",
      items: [
        {
          term: "Absent or never arrived",
          text: "The hero simply does not exist in your version, or never reached the place where the game begins. This is the cleanest choice for a first campaign because nobody competes with the party for the central role. Use it when your players want the setting more than the original plot.",
        },
        {
          term: "Missing",
          text: "The hero existed and has disappeared, failed or been captured. Finding out what happened gives the party a mystery and a reason to retrace early steps, but the investigation must produce its own leads rather than a trail of scenes where the hero already did the interesting work. Whatever the party finds, rescuing or replacing the hero should be their decision, not an obligation.",
        },
        {
          term: "Supporting NPC",
          text: "The hero appears as a non-player character (NPC) with a narrow job: a witness, a wounded survivor, a guild contact, someone who knows one useful thing. Give them one area of competence and one clear limit, such as an injury, a debt or a refusal to enter the place that matters. They can open a door; they must not walk through it, explain the revelation and win the fight on the other side.",
        },
        {
          term: "Independent rival",
          text: "The hero is pursuing the same goal by a different method and with different loyalties. A rival creates pressure because the party can cooperate, race, bargain or obstruct, and each choice changes what the rival does next. Keep the rival's progress visible through rumours, changed prices, closed routes or arrived-too-late scenes, and let the party overtake or ruin the rival. A rival who always wins off-screen is a protagonist in disguise.",
        },
        {
          term: "Historical legend",
          text: "The hero acted long ago and is now a statue, a disputed account or a cautionary tale. This suits a sequel or a setting your players know well, because they can argue with the legend, discover it was incomplete, or repeat its mistake. The legend should raise questions the party must answer in play, not supply answers they are expected to copy.",
        },
      ],
      outro:
        "Whichever option you choose, apply one test to every scene you prepare: if the protagonist NPC could settle this without the PCs, rewrite the scene until they cannot. They may lack the information, the authority, the numbers or the willingness, but the missing piece must be something the party supplies.",
    },
    {
      kind: "table",
      heading: "Choose where your campaign sits in time",
      headers: ["Timeline", "What it gives you", "What to watch"],
      rows: [
        [
          "Prequel",
          "Familiar places and factions before the game's outcome is settled. Players who know the source can enjoy early signs of what is coming.",
          "Do not make the party's work pointless because the game's opening already fixes the result. Aim their efforts at people and places whose fate the game never showed.",
        ],
        [
          "Parallel events",
          "The game's crisis happens nearby while the party handles its consequences elsewhere: refugees, shortages, a faction moving troops, a road made unsafe.",
          "Keep the original hero offstage. If the party can simply follow that hero, they will, and they become spectators again.",
        ],
        [
          "Sequel",
          "The game's ending has happened and left debts, vacancies and unfinished harm to deal with. The party inherits a changed world rather than a script.",
          "Decide which ending your table treats as history and say so plainly. Players who finished the game differently may otherwise argue with your setting instead of playing in it.",
        ],
        [
          "Alternate version",
          "The same starting situation, with no promise that events will follow the game. This gives knowledgeable players the most freedom to change the outcome.",
          "Warn players that knowledge from the game is a rumour, not a guarantee. Change at least one important loyalty, location or motive so memorised solutions do not work unchanged.",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Preserve the pressures, not the plot beats",
      paragraphs: [
        "Keep what a player recognises in the first ten minutes: the look and hardship of the place, the factions and what each one wants, the recurring problem the setting cannot solve, and the kind of choice the game keeps posing. Change what only worked because one controlled character followed instructions: required quest order, puzzles with one solution, revelations delivered in cutscenes, companions who wait to be collected, and an ending that arrives regardless of earlier choices.",
        "Convert each scripted beat into a situation by asking three questions. What is visibly wrong? Who wants incompatible outcomes? What changes if nobody intervenes? A locked gate the hero had to open becomes a checkpoint where guards, smugglers and hungry residents want different things, and the food convoy arrives tomorrow whether the party negotiates, sneaks, fights or finds another route. You now have something to run without deciding how it ends.",
      ],
    },
    {
      kind: "table",
      heading: "Conversion worksheet",
      headers: ["In the source game", "At the table"],
      rows: [
        [
          "The designated hero",
          "The party's shared responsibilities, divided so different PCs lead in different scenes",
        ],
        [
          "A mandatory quest step",
          "A problem with at least two workable approaches and a cost attached to each",
        ],
        [
          "A scripted cutscene or revelation",
          "Information the party can find, earn, buy, be told by an interested party, or miss",
        ],
        [
          "A companion with a fixed loyalty",
          "An NPC with a want, a limit and a price, who can refuse or leave",
        ],
        [
          "A boss fight that must be won",
          "A threat that can be fought, avoided, divided, bargained with or survived at a loss",
        ],
        [
          "A fixed ending",
          "Outcomes shaped by which factions the party helped, harmed or ignored",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Make the story party-sized",
      intro:
        "One hero's job list usually contains several distinct kinds of work. Spread them out instead of handing the whole list to the most talkative player:",
      items: [
        {
          term: "Divide the hero's responsibilities",
          text: "Separate investigation, negotiation, local knowledge, dangerous travel and the final decision. Link each strand to a different PC through their background, relationships, skills or debts, so each player has scenes where the party needs their character in particular.",
        },
        {
          term: "Give every PC a private reason to care",
          text: "A shared mission holds a party together for one session. Personal stakes hold it together when the mission changes. Ask each player for one thing their character wants from this place or faction that is not the main quest, and let pursuing it sometimes help and sometimes complicate the group's plan.",
        },
        {
          term: "Keep revelations in play",
          text: "Do not reserve the important discovery for an NPC's speech. Put evidence in places the PCs can search, people they can question, records they can steal and consequences they can witness. If one PC finds a clue, let it create a choice for the whole party rather than a monologue for that player.",
        },
        {
          term: "Let the climax need more than one pair of hands",
          text: "Build the final problem so no single character can solve it alone: ground to hold, people to convince, a ritual or machine to operate, a retreat to protect. The point is not to force a set piece. It is to make cooperation the reason the party succeeds where a lone hero was required before.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A six-step adaptation workflow",
      items: [
        {
          term: "Name the core conflict",
          text: "Write it in one sentence without naming the hero, for example: a hidden cult is exploiting a food shortage to seize a city that cannot feed itself. If the sentence needs the protagonist, you have described a plot, not a conflict.",
        },
        {
          term: "Choose the party's role",
          text: "Decide why these people, specifically, are placed to act: residents, investigators, deserters, traders, prisoners, junior members of a faction. Their role should give them access and obligations, not orders they cannot refuse.",
        },
        {
          term: "Map factions and locations",
          text: "List three to five factions with what each wants and what each will do if ignored, plus the handful of places where those wants collide. One page is enough to start.",
        },
        {
          term: "Find the first crisis",
          text: "Pick a small, immediate problem that shows the core conflict in action and can be resolved in one or two sessions. A missing food convoy teaches more about a starving city than an opening lecture on its history.",
        },
        {
          term: "Prepare situations, not routes",
          text: "For each situation, note who is involved, what they want, and what happens next if the party does nothing. Leave the method to the players.",
        },
        {
          term: "Allow a different outcome",
          text: "Decide before play begins which parts of the game's ending you are willing to lose. If the honest answer is none of them, run a prequel or sequel instead, where a different outcome costs the source less.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: Arx Fatalis without its hero",
      paragraphs: [
        "Arx Fatalis is set in a world where the surface has frozen and people live underground in a carved city, dependent on food, light and trade between levels and peoples. Its hero, Am Shaegar, is an outsider who arrives with no memory and becomes the person who investigates a cult trying to bring a destructive god into the world. You need none of the game's scenes to use that material, and players who have never heard of it only need the sentence above.",
        "Remove Am Shaegar entirely: in your version, no outsider arrives. Start instead with a food shipment that fails to reach the human level of the city. The PCs might be guards on the convoy, residents who were counting on it, a goblin trader accused of stealing it, or prisoners offered work in exchange for finding it. Each starting role gives the party a different first conversation and a different reason not to walk away.",
      ],
      items: [
        {
          term: "The first crisis",
          text: "At the empty depot the party can observe that the crates were unloaded, not ambushed: seals intact, porters paid, no bodies. Someone with authority redirected the food. They can question the depot clerk, follow the porters, check which level suddenly has full stores, or report back and watch who reacts badly. Each route teaches them a different faction's business.",
        },
        {
          term: "The wider threat",
          text: "Whoever diverted the food is buying loyalty for a cult that promises its god will remake the underground world. The party can expose the theft and starve the cult of recruits, outbid it by finding another food source, infiltrate the buyers, or decide the city's rulers are worse and negotiate. The cult's plan advances on its own timetable whenever the party spends sessions elsewhere, through new converts, closed storerooms and public sermons.",
        },
        {
          term: "A different ending",
          text: "Nothing requires the party to reproduce the game's confrontation. They might destroy the cult early and leave the city governed by the people who caused the shortage, or fail to stop the summoning ritual and spend the next arc dealing with what arrived. Both are complete campaigns. The source supplied the city, the shortage and the cult; the table supplied the outcome.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Start smaller than the game you love",
      paragraphs: [
        "A first-time Game Master does not need the whole game converted before session one. Prepare the first crisis, three factions, two or three places, and a short list of names. That is enough material to run, and it leaves room for the party's choices to decide what you prepare next. Converting forty hours of scripted content in advance mostly produces notes you will have to defend against your own players.",
        "Tell the group at session zero what you are adapting and what may change. Players who know the game can then enjoy recognising a place without treating their memory as a walkthrough, and players who do not know it are not punished for missing references. Agree that the game's version is background reading, not evidence in an argument about what must happen next.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before your first session",
      intro: "Check the adaptation itself, not the size of your notes:",
      items: [
        "Can you state the core conflict in one sentence that never names the original hero?",
        "Does each PC hold at least one responsibility, contact or personal stake that another PC does not?",
        "Could the party fail, refuse or redirect the first crisis and still have a campaign afterwards?",
        "Is there any scene where an NPC delivers the revelation, makes the decision or wins the fight while the party watches? Rewrite it.",
        "Have you named at least one part of the game's ending you are prepared to let the party change?",
        "Is your opening prep small enough to hold in a few pages: one crisis, a few factions, a few places?",
      ],
    },
  ],
  relatedAnswers: [
    "how-do-you-create-quest-hooks-without-railroading",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
    "how-much-of-the-plot-should-a-dm-prepare",
    "how-do-i-plan-story-arcs-for-an-rpg-campaign",
    "how-do-i-start-gming-for-the-first-time",
  ],
  discovery: {
    id: "answer-adapt-video-game-into-tabletop-rpg",
    parentCluster: "campaign-management",
    primaryIntent: "adapt video game into tabletop rpg",
    intentAliases: [
      "turn video game into d&d campaign",
      "original protagonist in rpg adaptation",
      "how to adapt a video game into a ttrpg campaign",
      "run a video game setting as a tabletop campaign",
      "what to do with the original protagonist in a game adaptation",
    ],
    uniqueValue:
      "A system-agnostic method for adapting a single-player video game by transferring the original protagonist's choices and responsibilities to the party, choosing a timeline, and converting scripted quests into open situations with different possible outcomes.",
    relatedIntents: [
      "answer-quest-hooks-without-railroading",
      "answer-players-going-off-script",
      "answer-campaign-threat-without-railroading",
      "answer-how-much-plot-should-a-dm-prepare",
      "answer-plan-story-arcs-rpg-campaign",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-quest-hooks-without-railroading",
        reason:
          "The quest hooks page covers designing open hooks in any setting; this page covers reassigning a single-player protagonist's agency to a party when adapting an existing video game narrative.",
      },
      {
        with: "answer-how-much-plot-should-a-dm-prepare",
        reason:
          "The plot preparation page covers how much story to prepare in general; this page covers what to preserve, change and hand to the PCs when the starting material is a finished single-player game.",
      },
    ],
  },
  seo: {
    title:
      "Turn a single-player video game into a TTRPG campaign | Codex Cryptica",
    description:
      "Adapt a single-player video game into a tabletop RPG campaign: reassign the hero's choices to the party, choose a timeline, and convert scripted quests into open situations.",
    image:
      "https://assets.codexcryptica.com/og/how-to-adapt-a-video-game-into-a-tabletop-rpg.jpg",
    imageAlt:
      "Four adventurers with lanterns overlooking an underground stone city of bridges, market stalls and carved dwellings",
  },
};
