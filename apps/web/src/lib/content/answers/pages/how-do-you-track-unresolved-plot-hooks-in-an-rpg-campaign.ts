import type { AnswerConfigInput } from "../schema";

export const howDoYouTrackUnresolvedPlotHooksInAnRpgCampaign: AnswerConfigInput =
  {
    slug: "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    category: "campaign-notes",
    question: "How do you track unresolved plot hooks in an RPG campaign?",
    kind: "framework",
    shortAnswer:
      "Unresolved plot hooks are tracked by treating them as living status states attached to existing campaign entities rather than entries on an endless quest checklist. Record each hook with five lightweight attributes: the origin source, the affected faction or NPC, current lifecycle status (dormant, simmering, active, or rotting), its urgency clock, and the concrete consequence that manifests in the world if the players choose to ignore it.",
    sections: [
      {
        kind: "prose",
        heading: "The backlog trap: why quest-log trackers fail at the table",
        paragraphs: [
          "Many Game Masters attempt to manage unresolved plot hooks like tickets in a software backlog: a sprawling, ever-growing spreadsheet or bulleted checklist of unfinished mysteries, missing family members, and obscure dungeon rumours. Over a multi-month campaign, this list balloons to forty items. The GM feels constant guilt over forgotten leads, while players feel overwhelmed by a chore list that resembles a video game quest log rather than an authentic tabletop world.",
          "The fundamental flaw of a static quest log is that it assumes unpursued leads freeze in amber until adventurers arrive to resolve them. In an organic tabletop setting, the world moves whether the party intervenes or not. When a lead is neglected, factions advance their plots, rivals claim unprotected treasures, and unchecked dangers escalate. Tracking hooks as living states tied to specific factions and locations eliminates backlog anxiety and makes player inaction feel just as consequential as heroic intervention.",
        ],
      },
      {
        kind: "list",
        heading: "The five-attribute living hook framework",
        intro:
          "Whenever a new rumour, mystery, or patron request surfaces during play, record it on an index card or entity note with these five operational attributes:",
        items: [
          {
            term: "Origin source & patron",
            text: "Who delivered or revealed this lead, and what stake do they hold in its outcome? A hook anchored to a weeping apothecary seeking a rare mountain blossom carries distinct personal obligations compared to an anonymous bounty posted on a tavern noticeboard.",
          },
          {
            term: "Bound entity anchor",
            text: "Never float a hook in isolation. Tether it directly to an existing settlement, NPC, or faction in your campaign notes. When the hook escalates, that entity's status changes automatically.",
          },
          {
            term: "Four-stage lifecycle status",
            text: "Classify every hook into one of four distinct phases: Dormant (known background lore with no immediate pressure), Simmering (developing off-screen, advancing one tick each session), Active (urgent, front-and-centre dilemma with immediate table stakes), or Rotting (escalated or superseded because the party chose to bypass it).",
          },
          {
            term: "Urgency clock",
            text: "A simple countdown (typically 2 to 4 ticks). Every session the party undertakes an unrelated expedition or spends downtime elsewhere, tick the clock. When the clock fills, the hook transitions to the next lifecycle stage automatically.",
          },
          {
            term: "Default consequence of inaction",
            text: "The single most important field: what happens if the players ignore this entirely? If the party chooses not to intercept the dwarven gunsmith's stolen blueprints, the local smuggler syndicate manufactures black-powder pistols and armed street riots erupt three sessions later.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked Example Scenario: Before and After",
        paragraphs: [
          "Consider how a Game Master handles an uninvestigated lead regarding strange chanting heard beneath the docks of a coastal city:",
        ],
        items: [
          {
            term: "The static checklist approach",
            text: "The GM writes 'Investigate dock cult' in a campaign notes document. For the next five sessions, the party is busy hunting mountain wyverns. The GM constantly rereads the line, feels awkward that the lead was dropped, and eventually reintroduces an NPC in a tavern who repeats the exact same plea. The world feels frozen, artificial, and dependent on player prompts.",
          },
          {
            term: "The living framework approach",
            text: "The GM logs 'The Sunken Choir', anchored to Harbour Mistress Vane, status Simmering, with a 3-tick clock and inaction consequence: 'The cult completes its ritual, poisoning the harbour basin with black salt and halting merchant shipping.' While the party hunts wyverns, the clock ticks to zero. When the party returns victorious, the harbour is quarantined, fish are washing ashore dead, and fishmongers are rioting in the streets.",
          },
          {
            term: "Why it works",
            text: "The world feels autonomous and alive. The players never feel cheated because their decision to hunt wyverns had tangible, observable consequences on the city they left behind.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Post-Session Hook Maintenance Checklist",
        intro:
          "Perform this five-minute maintenance routine at the end of every game session to keep your campaign threads lean and reactive:",
        items: [
          "Logged any new rumours, clues, or promises made during the session as anchored hooks with named NPCs or factions.",
          "Advanced the urgency clock by one tick on any simmering hooks the party knowingly bypassed during today's adventure.",
          "Escalated at least one expired clock into a visible world consequence or ambient tavern rumour.",
          "Archived resolved, failed, or permanently obsolete hooks so your active roster never exceeds five to seven items.",
          "Highlighted the two or three simmering hooks most relevant to the destination declared by the players for next week.",
        ],
      },
    ],
    codexConnection: {
      heading: "Tracking plot threads as directed relationship edges",
      paragraphs: [
        "Linear checklists fail because RPG campaigns are networks, not todo lists. Codex Cryptica's local-first relationship graph lets you attach quest leads, faction rivalries, and open secrets directly as directed edges between character cards and location nodes. As factions advance their agendas or clocks expire between sessions, your campaign map reflects changing power dynamics in real time without manual spreadsheet reconciliation.",
      ],
      linkText: "Explore the Sandbox Campaign Manager",
      href: "/for/sandbox-campaigns",
    },
    relatedTools: [
      {
        title: "Quest Hook Generator",
        description:
          "Generate multi-stage adventure leads with conflicting faction stakes and concrete time pressures.",
        href: "/tools/quest-hook-generator",
      },
      {
        title: "Faction Generator",
        description:
          "Create competing regional factions whose off-screen agendas drive background campaign momentum.",
        href: "/generators/faction",
      },
      {
        title: "RPG NPC Generator",
        description:
          "Quickly create patrons, informants, and rival investigators to anchor open plot threads.",
        href: "/tools/rpg-npc-generator",
      },
    ],
    relatedForPages: [
      {
        title: "Sandbox RPG Campaigns",
        description:
          "Track player-directed campaigns with reactive relationship graphs and living faction turns.",
        href: "/for/sandbox-campaigns",
      },
      {
        title: "Conspiracy Campaigns",
        description:
          "Model secret webs, hidden conspirators, and escalating mystery clocks across your setting.",
        href: "/for/conspiracy",
      },
      {
        title: "West Marches Campaigns",
        description:
          "Organise shared exploration logs, open-table rumours, and player-driven wilderness expeditions.",
        href: "/for/west-marches",
      },
    ],
    relatedAnswers: [
      "how-do-you-organise-rpg-campaign-notes",
      "how-do-you-organise-npc-relationships",
      "how-much-prep-do-you-need-for-an-rpg-session",
      "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
  ],
    discovery: {
      id: "answer-unresolved-plot-hooks",
      parentCluster: "campaign-notes",
      primaryIntent: "how to track unresolved plot hooks in an rpg campaign",
      intentAliases: [
        "how to track plot hooks rpg",
        "tracking open quests ttrpg",
        "manage quest hooks gm",
        "unresolved plot threads campaign",
        "how to manage rpg plot hooks",
      ],
      uniqueValue:
        "A five-attribute living hook framework replacing static quest checklists with anchored entities, a four-stage lifecycle, urgency clocks, and default consequences for player inaction.",
      relatedIntents: [
        "answer-campaign-notes",
        "answer-npc-relationships",
        "for-sandbox-campaigns",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-campaign-notes",
          reason:
            "Campaign notes teaches a broad three-layer document architecture for the whole campaign; plot hooks teaches an operational lifecycle and clock framework specifically for tracking open leads. Different questions on campaign organisation.",
        },
      ],
    },
    seo: {
      title:
        "How do you track unresolved plot hooks in an RPG? | Codex Cryptica",
      description:
        "Keep open RPG quest leads and campaign plot threads manageable using a 5-point living framework: source, anchor, lifecycle, urgency, and inaction consequences.",
      image:
        "https://assets.codexcryptica.com/og/how-to-track-unresolved-plot-hooks-in-an-rpg-campaign.jpg",
      imageAlt:
        "Game Master inquiry corkboard with parchment cards, red connecting twine, heraldic seals, and open campaign journal",
    },
  };
