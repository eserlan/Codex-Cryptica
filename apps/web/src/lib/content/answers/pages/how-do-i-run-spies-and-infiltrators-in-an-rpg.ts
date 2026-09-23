import type { AnswerConfigInput } from "../schema";

export const howDoIRunSpiesAndInfiltratorsInAnRpg: AnswerConfigInput = {
  slug: "how-do-i-run-spies-and-infiltrators-in-an-rpg",
  category: "session-prep",
  publishedAt: "2026-09-24",
  question: "How do I run spies and infiltrators in an RPG?",
  kind: "framework",
  shortAnswer:
    "Make infiltration a team operation even when one character goes inside. Give the infiltrator a clear objective, then let the rest of the party create access, cover, distractions, surveillance, or an extraction plan under the same pressure. Reveal useful information while the group can still act on it, and prepare several viable routes with consequences for delay, partial success, and exposure.",
  sections: [
    {
      kind: "prose",
      heading: "Infiltration isolates characters by design",
      paragraphs: [
        "A spy may be the only character who can pass as a clerk, enter a guarded archive, or speak with a source without attracting attention. That can make a strong scene for the player, but a long sequence of private checks leaves everyone else watching. The problem is sharper when the infiltrator returns with information after the important choices have already passed.",
        "Treat the operation as one shared problem with actions happening in different places. The infiltrator can take the risk only they can take, while the rest of the team changes the conditions around them. Give each action a clear effect on access, time, suspicion, or the information available. Cut between those actions whenever the situation changes, rather than resolving one character's entire operation in isolation.",
      ],
    },
    {
      kind: "list",
      heading: "Build the operation around shared roles",
      intro:
        "Choose the roles that fit this job; one character can take more than one:",
      items: [
        {
          term: "Access",
          text: "The infiltrator gets close to the target through a believable identity, a compromised credential, an invitation, or a hidden route. Decide what would make that cover credible and what might expose it. The objective should need more than simply getting through the door.",
        },
        {
          term: "Cover and diversion",
          text: "Other characters provide a reason for guards, staff, or rivals to look elsewhere. A public argument, a false maintenance request, or a staged delivery can change where attention falls. Let the distraction create an opening, not erase the security problem altogether.",
        },
        {
          term: "Surveillance and information",
          text: "A lookout tracks patrols, listens to the target, or watches for a change in routine. Share discoveries that can affect the next decision: a second guard arrives, the meeting moves rooms, or the target is about to destroy a record.",
        },
        {
          term: "Objective and choice",
          text: "Name what the team needs and what it can afford to leave behind. Copying a ledger, planting evidence, identifying a source, and keeping a witness safe may conflict once time runs short. The infiltrator can uncover that conflict, but the party should decide which cost to accept.",
        },
        {
          term: "Extraction and contingency",
          text: "Give the team at least one way out and one response if the original cover fails. An extraction need not be safe; it should give the characters a meaningful option, such as abandoning equipment, exposing an ally, or leaving by a route that costs time.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Prepare a security problem, not a correct route",
      paragraphs: [
        "Sketch what the location protects, who is watching it, and how its security responds to suspicious events. Include more than one plausible way in or out, but do not plan a complete solution for the players. A staff entrance, a forged invitation, and a service tunnel can each work while carrying different risks. The players choose which risk to take and may invent another approach.",
        "Use the rules of the game for uncertain actions. If the system has clocks, heat, suspicion, or flashbacks, use those procedures rather than layering on a second subsystem. Otherwise, track only pressure that can change a decision: a guard moving closer, a scheduled handover, or a contact waiting outside. Failure should change access, time, trust, or exposure, not simply stop the operation at a locked door.",
      ],
    },
    {
      kind: "list",
      heading: "Keep information and consequences in play",
      intro:
        "When the operation changes, give the players enough to choose what happens next:",
      items: [
        {
          term: "Put findings in the open when possible",
          text: "Players can know more than their characters. Agree how the table handles secret information, then share discoveries in a way that keeps the group involved. If a character alone knows a detail, keep the private exchange brief and return with a choice the group can discuss without forcing the character to reveal what they would conceal.",
        },
        {
          term: "Make partial success useful",
          text: "The spy might get the document but leave a trace, win the source's trust but owe a favour, or learn the meeting place after the target has left. Preserve forward movement while making the cost matter to the operation or the campaign.",
        },
        {
          term: "Let exposure change the situation",
          text: "A compromised identity can close a route, put an ally under scrutiny, or make the target feed the spy false information. Avoid treating exposure as an automatic combat encounter; the team can still bargain, retreat, improvise, or pursue the objective another way.",
        },
        {
          term: "Handle betrayal with player trust",
          text: "A character's divided loyalties can produce strong play when the player has agreed to that tension. Establish expectations for secret notes, concealed plans, and character-versus-character conflict before the operation. Do not use hidden objectives to take away another player's agency or spring a real-world trust test on the table.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Compress solo infiltration when it serves the session",
      paragraphs: [
        "A short solo scene can be the right choice when one character is uniquely placed to act, especially if the other players have concurrent work or are happy to watch that moment. State the immediate objective and pressure, resolve the meaningful uncertainty, then return to the group with a changed situation. If the operation requires several steps, cut away at decision points and ask what the others are doing while time passes.",
        "Do not force every character into the building. The outside team may be more useful managing a contact, watching an exit, diverting a patrol, or deciding whether to burn a safe house. Their actions should affect what the infiltrator can risk, while the infiltrator's discoveries should give the whole party something consequential to decide.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the embassy ledger",
      paragraphs: [
        "The party needs a ledger from an embassy before a courier takes it to the border. The spy enters during a reception under a borrowed identity. The other characters stay outside, where one has arranged a service interruption and another watches the courier's car.",
      ],
      items: [
        {
          term: "The isolated version",
          text: "The GM and spy player resolve the reception through a string of private disguise, observation, and lock checks. The other players wait. When the spy finds the ledger, they return to the party with the fact that the courier has left, but the group had no chance to affect the timing or choose what evidence to take.",
        },
        {
          term: "The shared operation",
          text: "The spy learns the ledger is in the ambassador's study, but the courier has been called forward early. Outside, the mechanic can keep the service lift stalled, buying time but drawing staff to the basement. The lookout sees the courier's driver leave the car and head for the reception. The spy can copy the relevant pages quickly, take the whole ledger and risk being caught, or photograph a page that names a local source. The party decides to delay the courier by exposing the service interruption, while the spy copies the source's page and leaves the ledger behind. They get the lead, but embassy staff now know the service system was tampered with.",
        },
        {
          term: "Why it works",
          text: "The spy gets the access and discovery that make the role distinctive. The outside characters change the time available, and the information arrives before the party must choose what to risk. The operation leaves a consequence that can shape the next session without making exposure an automatic failure.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you run an infiltration",
      intro:
        "Prepare enough to make the security legible, then leave the route to the players:",
      items: [
        "What does the team need, and what can it leave behind if time runs short?",
        "What is the infiltrator's cover, and what specific event could put it under pressure?",
        "What can the other characters do that changes access, attention, information, or extraction?",
        "What visible pressure advances while the team acts, and how will the players notice?",
        "What can partial success preserve, and what cost follows from exposure or delay?",
        "Are there at least two plausible approaches, each with a different risk or price?",
        "Have the players agreed how to handle private information, disguises, and character betrayal?",
        "If one character acts alone, when will you cut back and what decision returns to the group?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep contacts and cover identities tied to the campaign",
    paragraphs: [
      "A campaign knowledge graph can connect a spy's cover identity to its source, the people who can verify it, the location being entered, and the faction that benefits from the operation. Recording those relationships makes it easier to bring a compromised contact or exposed identity back into later play.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Connect spies, contacts, cover identities, factions, and locations across a campaign.",
      href: "/solutions/rpg-knowledge-graph",
    },
    {
      title: "Heist generator",
      description:
        "Generate a target, security obstacles, complications, and an escape for a covert operation.",
      href: "/generators/heist",
    },
  ],
  relatedAnswers: [
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-i-run-political-intrigue-and-faction-play",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    "how-do-i-run-an-investigator-without-sidelining-the-party",
  ],
  discovery: {
    id: "answer-run-spies-infiltrators-rpg",
    parentCluster: "specialist-roles",
    clusters: ["specialist-roles", "heist", "faction-creation"],
    primaryIntent:
      "how to run spies and infiltrators in a tabletop rpg without sidelining the party",
    intentAliases: [
      "how to run a spy character in an rpg",
      "how to run an infiltration mission in a tabletop rpg",
      "how to keep spy missions from splitting the party",
      "how to run covert operations in an rpg",
      "how to involve the party in a solo infiltration",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Gives GMs a cross-genre operation framework that assigns useful work to both the infiltrator and the outside team, then connects information, pressure, and exposure to shared player decisions. It focuses on covert access and keeping the group involved, rather than the broader score structure of a heist or general specialist spotlight advice.",
    relatedIntents: [
      "answer-specialist-character-spotlight",
      "answer-run-heist-in-tabletop-rpg",
      "answer-run-hackers-netrunners",
      "answer-run-political-intrigue",
      "answer-run-factions-sandbox",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The specialist spotlight answer gives reusable scene patterns for any expert; this answer focuses on covert access, cover, security response, and outside-team roles during an infiltration operation.",
      },
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "The heist answer structures a full score through casing, engagement, alarms, and escape; this answer focuses on running an infiltrator inside a location while the rest of the party shapes the operation.",
      },
      {
        with: "answer-run-hackers-netrunners",
        reason:
          "The hacker answer handles digital intrusion and physical crew response; this answer covers non-digital covert access, identity, surveillance, and extraction across genres.",
      },
      {
        with: "answer-run-political-intrigue",
        reason:
          "The political intrigue answer covers faction pressure and leverage; this answer handles the scene-level operation of entering a protected place or organisation without isolating the party.",
      },
      {
        with: "answer-run-factions-sandbox",
        reason:
          "The sandbox faction answer tracks organisations' ongoing moves; this answer is about a particular covert operation and its team roles, security, and consequences.",
      },
      {
        with: "answer-run-investigator-without-sidelining-party",
        reason:
          "This answer structures covert access and operation roles; the investigator answer concerns clue interpretation and detective competence during a broader investigation.",
      },
    ],
  },
  seo: {
    title: "How to Run Spies and Infiltrators in an RPG | Codex Cryptica",
    description:
      "Run a spy or infiltration mission as a team operation, with shared objectives, useful outside roles, visible pressure, and meaningful consequences for exposure.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-spies-and-infiltrators-in-an-rpg.jpg",
    imageAlt:
      "A spy inside a guarded archive coordinates with allies watching the entrance and preparing an extraction",
  },
};
