import type { AnswerConfigInput } from "../schema";

export const howDoIHandlePlayersWhoKeepTryingToRecruitDefeatedEnemies: AnswerConfigInput =
  {
    slug: "how-do-i-handle-players-who-keep-trying-to-recruit-defeated-enemies",
    category: "running-the-game",
    publishedAt: "2026-10-18",
    question:
      "How do I handle players who keep trying to recruit defeated enemies?",
    kind: "framework",
    shortAnswer:
      "Surrender is not allegiance. A captive who stops fighting has chosen survival, not loyalty, and Persuasion or Intimidation can change what they will do under pressure without rewriting what they believe, owe, or fear. Having a captive act on those established motives is not unfair when you have shown the warning signs in play, given the party a real chance to earn trust or strike a bargain they can honour, and let different captives respond in different ways.",
    sections: [
      {
        kind: "prose",
        heading: "Surrender is not allegiance",
        paragraphs: [
          "Would it be unfair to have a press-ganged captive turn on the party at the dragon's lair? Not necessarily. It is fair when the turn follows motives the players have already seen, when you signalled the risk before the decisive scene, and when the party had a genuine chance to change the outcome by earning trust, offering a bargain the captive could accept, or choosing not to bring an unwilling prisoner into a fight they were never going to join. It becomes a gotcha when the betrayal arrives without warning, ignores everything the party did to build trust, or exists only to teach the players a lesson.",
          "The habit to break is treating one successful conversation as a permanent change of side. A defeated enemy who talks, walks with the party, or even helps carry supplies may still resent the people who captured them, still fear the dragon they serve, and still plan to leave at the first safe moment. Reluctant compliance looks like loyalty from the outside. From the captive's side of the rope, it can feel very different, and the game stays fair when that difference stays visible at the table.",
        ],
      },
      {
        kind: "list",
        heading: "Four states that are easy to collapse into one",
        intro:
          "Before you decide what a captive does next, name which state they are actually in. The four states below need different handling, and moving between them takes time, evidence, or a changed situation:",
        items: [
          {
            term: "Captured or surrendered",
            text: "The NPC has stopped fighting because continuing would mean death, capture, or worse. They want to survive the next few minutes. They have not agreed to help, and they may say whatever keeps them alive, including things they do not mean.",
          },
          {
            term: "Temporarily cooperating",
            text: "The NPC will do a limited thing for a limited reason: answer questions to avoid harm, guide the party past one checkpoint for safe release, or keep quiet while the party deals with a common enemy. Cooperation has terms, even when nobody wrote them down. When the terms run out, so does the help.",
          },
          {
            term: "Genuinely loyal",
            text: "The NPC now wants the party to succeed and will take risks for them without being watched. Loyalty of this kind usually grows from repeated fair treatment, shared danger handled honestly, or a cause the NPC has come to share. It is not produced by a single conversation at swordpoint.",
          },
          {
            term: "Morally changed",
            text: "The NPC's beliefs or commitments have shifted: they no longer support their old cause, no longer accept an old contract as binding, or no longer want the life they had. That change needs experiences that challenge the old belief, not just pressure to say new words. A captive can cooperate for months without ever reaching this state, and that is a coherent outcome, not a failed roll.",
          },
        ],
        outro:
          "Most trouble starts when the table logs a captive in the first state and plays them as if they were in the third. Naming the state out loud, even briefly, realigns what everyone expects the next scene to prove.",
      },
      {
        kind: "list",
        heading: "What a social check can and cannot change",
        intro:
          "Use the rules of the game you are running. In D&D, a Charisma check influences a creature that can hear and understand the approach; it does not compel belief. Apply that limit plainly:",
        items: [
          {
            term: "A high roll improves the offer, not the person",
            text: "A strong Persuasion roll can make a request sound reasonable, lower the price of a limited favour, or convince a wary captive that the party will keep a stated promise. It cannot make an artificer stop believing her contract binds her, or make a captive forget that the party threatened to kill her an hour ago.",
          },
          {
            term: "Intimidation buys compliance with an expiry date",
            text: "A threat can produce quiet obedience while the threat is present and credible. Expect the obedience to weaken with distance, opportunity, or a stronger fear on the other side. A captive who obeys because she is frightened has given you information about what she fears, not evidence that she agrees with you.",
          },
          {
            term: "Repeated rolls are not repeated chances to wear someone down",
            text: "If the circumstances have not changed, another Persuasion roll is the same request with different dice. Ask what is new: a better offer, new information, proof that a promise was kept, time spent treating the captive fairly, or a change in who holds power. Let the new fact, not the reroll, open the next check.",
          },
          {
            term: "Set the boundary before the roll",
            text: "Say what is actually at stake. For example: she might agree to stay out of the fight, but she will not attack the dragon she serves. Roll to see whether she accepts the narrower deal and what it costs. The players then make an informed choice, and a success means something specific instead of everything.",
          },
        ],
      },
      {
        kind: "list",
        heading: "A short NPC decision card",
        intro:
          "For any captive the party wants to keep, note these seven lines before the next session. Short phrases are enough. The card is what you consult when an opportunity appears, so the decision comes from the fiction rather than from a script you wrote to punish or reward the party:",
        items: [
          {
            term: "Wants",
            text: "What the NPC is trying to get now. Freedom, safety, payment, revenge on a rival, a way home, protection for someone else.",
          },
          {
            term: "Fears",
            text: "What they are trying to avoid. Death at the party's hands, punishment from their employer, disgrace, harm to family, being trapped with no exit.",
          },
          {
            term: "Owes loyalty to",
            text: "A person, contract, god, gang, family, or nobody at all. Note whether the tie is affection, habit, money, oath, or fear. Each tie breaks, or holds, for different reasons.",
          },
          {
            term: "Will do under pressure",
            text: "The limited help fear or payment can reliably produce. March without resisting, answer direct questions, stay silent, carry supplies, point out one danger.",
          },
          {
            term: "Will never do without a genuine change",
            text: "The line pressure alone will not cross. Attack their employer, betray a named person, break a sworn contract, lead the party to their own kin. Write the line before the party tests it.",
          },
          {
            term: "What could earn trust",
            text: "A specific, observable act. Kept promises, release without conditions, healing without demanding payment in service, protection from their old employer, a share of loot given freely.",
          },
          {
            term: "Likely move when an opportunity appears",
            text: "What they will probably do when nobody is watching. Run, hide, bargain with the other side, warn a friend, stay neutral, help once and leave. Decide this from the lines above, not in the moment.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give the players choices that can actually work",
        intro:
          "Recruitment is one option among several, and it is often the hardest. Put the other options on the table in the fiction so the players are choosing, not guessing:",
        items: [
          {
            term: "Release the prisoner",
            text: "Let them go, with or without conditions. Release can earn goodwill, remove a liability before a dangerous fight, and show other NPCs that surrender to this party is survivable. That reputation matters the next time an enemy considers laying down arms.",
          },
          {
            term: "Negotiate a limited truce",
            text: "Agree on a narrow, time-bound deal: safe passage for information, a head start in exchange for staying out of the next fight, no pursuit for one day. Limited deals suit captives who will never join the party but can honour a bargain that serves them too.",
          },
          {
            term: "Strike a deal that serves both sides",
            text: "Pay, protect, transport, or remove a threat the captive also wants gone. A deal works when the captive gains something they value without having to pretend loyalty. Check the decision card: the offer has to speak to what they want or fear.",
          },
          {
            term: "Hold something they value, and name the cost honestly",
            text: "Keeping a weapon, a contract copy, a mount, or knowledge of a hiding place can secure short-term cooperation. Name it as pressure, not friendship. The captive will behave like someone being pressured, including looking for the moment the pressure lifts.",
          },
          {
            term: "Offer a longer path to change",
            text: "If the players want genuine loyalty or a real change of heart, give it time and tests: fair treatment across several scenes, a kept promise when keeping it costs something, a chance to leave that they decline. One good scene can start that path. It rarely finishes it.",
          },
          {
            term: "Accept that this NPC stays hostile",
            text: "Some captives will not be talked round, and that is a valid result. Hand them to local authority, leave them secured and supplied while the party moves on, or let them depart as an enemy who now knows the party's faces. A clear no is more useful at the table than endless renegotiation.",
          },
        ],
      },
      {
        kind: "example",
        heading: "At the dragon's lair: three signposted outcomes",
        paragraphs: [
          "The party approaches a dragon's lair with two captives in tow. The goblin wizard fled an earlier fight, was tracked, captured, and has marched with the party under threat of death. The lawful evil artificer serves the dragon under a contract she has described, more than once, as binding. She has refused to discuss breaking it. Both have asked to be released. Neither has been offered freedom, payment, or a deal they asked for. The players expect help in the fight. Run each captive from her decision card, not from a single rule about evil NPCs.",
        ],
        items: [
          {
            term: "The artificer holds her contract",
            text: "She will not help attack the dragon, and she has already said so in plainer terms: she asked to be left outside the lair, she corrected a player who called her an ally, and she kept her tools packed when the party handed out fight roles. If the party drags her inside and the dragon offers her a chance to prove loyalty, she takes the dragon's side or steps away from the party at the moment it matters. The clues were the refusals, the contract talk, and the request to leave. Her behaviour is consistent, not spiteful. She might still honour a narrower deal, for example staying neutral outside if the party releases her afterwards, because that deal does not require her to break the contract.",
          },
          {
            term: "The goblin looks for the exit",
            text: "She never agreed to fight a dragon. She agreed, under threat, not to run while the party was watching. Her card reads simply: wants freedom and safety, fears the dragon and the party in roughly equal measure, will march and stay quiet under pressure, will never volunteer for a dragon fight. At the lair she tries to slip away in the confusion, hides rather than casting for either side, or freezes until the danger passes. That is not a betrayal scene. It is a frightened prisoner acting on the only goal she has shown the party since capture.",
          },
          {
            term: "What changes if the party earned it",
            text: "Suppose that earlier the party healed the goblin without demanding service in return, returned the artificer's tools as a sign of good faith, and negotiated a written, limited deal: guide us to the lair entrance, stay out of the fight, and leave free with payment, whatever happens inside. Now the outcomes shift for reasons the players can point to. The goblin might stay neutral as agreed, warn the party about one trap she recognises, or even loose one spell against a common enemy before leaving. The artificer might keep the narrow bargain exactly because it lets her honour both the contract and the deal. Neither has become loyal. Both are responding to treatment and terms the party actually established.",
          },
          {
            term: "Why it works",
            text: "Each outcome was decided from wants, fears, loyalties, and stated lines, and each was visible before the fight. The players saw the artificer's refusals and the goblin's attempts to leave, and they saw what happened when a fair deal was offered instead. Nothing turns on alignment alone, and nothing requires the GM to plan a double-cross in advance. When an opportunity appears, you read the card and play the move that follows from it. The party can argue with that reading, and the argument itself shows the signals landed.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Consequences are not the same as punishment",
        intro:
          "An unwilling captive who flees, stalls, bargains with a rival, or helps against a common enemy is producing a consequence of how they were treated and what they want. Keep that separate from a punishment beat you aim at the players:",
        items: [
          {
            term: "Let the motive decide the move",
            text: "When the moment comes, ask what this NPC wants most and what this opening lets them do about it. Fleeing suits a captive who wants freedom. Warning the dragon suits one whose loyalty or fear points that way. Staying quiet suits one who wants to survive whoever wins. If you cannot answer from the card, you are improvising a twist, so pause and check the card first.",
          },
          {
            term: "Telegraph before the decisive scene",
            text: "Use the scenes you already have. A captive who will not fight says so at camp. One who fears an employer flinches at their name or asks what happens if they are seen helping. One who plans to run tests the rope, studies the road, or asks to be left behind. The party may ignore the signs, and that is their choice, but the signs have to be there to ignore.",
          },
          {
            term: "Do not make every captive betray the party",
            text: "A table where every prisoner stabs the party in the back teaches players to kill captives, which helps nobody. Pragmatic survivors keep bargains that protect them. A mercenary may serve honourably until the contract ends and then leave without malice. An enemy who hates the party's foe more than the party may help once, for their own reasons, and depart. Variety is what makes any single betrayal readable when it does happen.",
          },
          {
            term: "Different captives answer differently",
            text: "The artificer treats her contract as a fact about who she is; pressure does not dissolve it, and she may respect a party that recognises the line even while refusing their larger request. The goblin treats the party as weather: dangerous, temporary, to be survived and then avoided. Running both from the same evil NPC script erases the distinction the players spent scenes discovering. Keep the answers separate, and let the party learn that reading the person works better than reading the alignment line. Alignment describes tendencies. It does not settle what a given person will do on a given night, and it does not make change impossible for anyone, only uneven and rarely instant.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "At the table when it keeps happening",
        paragraphs: [
          "If every fight now ends with a tied-up prisoner and a long interrogation, say so outside the fiction. Ask the players what they enjoy about it: collecting allies, avoiding killing, looking for information, or testing how far persuasion can go. Agree on how your table will handle it. For example, one full conversation to establish terms, after which further pleading without new facts resolves in a sentence. That agreement protects the players' creativity while keeping the campaign moving, and it lets you spend session time on the captives who genuinely matter.",
          "Handle captivity itself with care. Tying someone up and marching them along is already coercion; threats and pain do not become a reliable route to loyalty because a roll succeeded. If interrogation scenes drift towards torture, or if any player is uncomfortable with what the party is doing to prisoners, pause and talk about it directly. You can set a line together, move such scenes off screen, or change how surrender works at your table. A game where prisoners reliably become friends after being hurt teaches a lesson nobody at the table chose, so do not let the dice teach it by accident.",
        ],
      },
      {
        kind: "checklist",
        heading: "Before you bring a captive into the next big scene",
        intro:
          "Run through this while the party is still travelling, not once initiative is rolled:",
        items: [
          "Write the seven-line decision card for each captive the party is keeping: wants, fears, loyalty owed, what pressure produces, the line they will not cross, what could earn trust, and their likely move when an opening appears.",
          "Name each captive's current state out loud to yourself: captured, temporarily cooperating, genuinely loyal, or morally changed. Play the state they are in.",
          "Check what the party has actually offered or done: a kept promise, fair treatment, payment, release, or only threats. Let the captive's trust reflect that record.",
          "Before any social check, state the narrow deal on the table and the line that is not being rolled for. Roll only where the outcome is genuinely open.",
          "Plant or replay one clear signal of risk before the decisive scene: a refusal, a request to leave, contract talk, camp behaviour, or a tested rope.",
          "Decide each captive's likely move from the card now, including the neutral and helpful options, so nobody betrays or rescues the party by default.",
          "If interrogations are eating the session, agree with the players how repeated attempts without new facts will be resolved, and what captivity content stays off screen.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep each captive's motives where you can find them",
      paragraphs: [
        "The decision card only helps if you can find it when the lair door opens. In Codex Cryptica, keep the card on the NPC's record and link the captive to the party, to the employer or dragon they serve, and to the location where they were captured. The links make divided loyalty visible at a glance: one glance shows who this person owes, who is pressuring them, and which promises the party has actually made.",
        "After the session, update the state field in your notes from cooperating to loyal, gone, or still hostile, and note the promise or slight that caused the change. The next captive conversation then starts from the record, not from memory.",
      ],
      linkText: "Generate an NPC",
      href: "/generators/npc",
    },
    relatedTools: [
      {
        title: "NPC generator",
        description:
          "Create an NPC with a role, want, and boundary, then note what pressure can and cannot change before the party tests it.",
        href: "/generators/npc",
      },
      {
        title: "D&D NPC generator",
        description:
          "Generate a D&D-flavoured NPC with ancestry and hooks when a defeated enemy needs a name, motive, and line they will not cross.",
        href: "/generators/dnd-npc",
      },
      {
        title: "Faction generator",
        description:
          "Give a captive an employer, contract, or gang to owe loyalty to, so their refusals have a source the party can discover.",
        href: "/generators/faction",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Dungeons & Dragons",
        description:
          "Campaign management for D&D: keep NPCs, factions, locations, and quests connected between sessions.",
        href: "/for/dungeons-and-dragons",
      },
    ],
    relatedAnswers: [
      "how-do-i-improvise-npcs-in-dnd",
      "how-do-i-make-roleplay-more-engaging",
      "how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
      "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
      "how-do-i-roleplay-npcs-if-im-not-good-at-acting",
    ],
    discovery: {
      id: "answer-recruit-defeated-enemies",
      parentCluster: "running-the-game",
      clusters: ["running-the-game", "social-play"],
      primaryIntent:
        "how do i handle players who keep trying to recruit defeated enemies",
      intentAliases: [
        "players keep trying to recruit defeated enemies",
        "how to handle players recruiting captured enemies rpg",
        "surrender is not allegiance npc loyalty",
        "dnd persuasion is not mind control captured enemy",
        "would it be unfair to have a captive betray the party",
        "how to run press-ganged npc captives fairly",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A four-state model for captives (surrendered, cooperating, loyal, morally changed), a seven-line NPC decision card, and a signposted dragon lair example showing how contract-bound and freedom-seeking captives act differently without a scripted betrayal.",
      relatedIntents: [
        "answer-improvise-npcs-in-dnd",
        "answer-make-roleplay-more-engaging",
        "answer-campaign-threat-without-railroading",
        "answer-npc-tell-us-everything",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-improvise-npcs-in-dnd",
          reason:
            "That answer covers inventing an unexpected NPC in seconds; this answer covers what happens after an enemy is captured, including states of cooperation, social check limits, and fair consequences over later scenes.",
        },
        {
          with: "answer-make-roleplay-more-engaging",
          reason:
            "That answer covers structuring social scenes around a meaningful choice; this answer applies motive and boundary work specifically to captives the party wants to recruit, including contracts, coercion, and telegraphed betrayal risk.",
        },
      ],
    },
    seo: {
      title:
        "How do I handle players recruiting defeated enemies? | Codex Cryptica",
      description:
        "Surrender is not allegiance. Handle captive recruitment fairly: track motives, telegraph risk, and let Persuasion change behaviour, not belief.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-players-who-keep-trying-to-recruit-defeated-enemies.jpg",
      imageAlt:
        "Two captive NPCs travelling unwillingly with an adventuring party towards a dragon lair entrance at dusk, one checking a contract scroll and one looking back towards the road",
    },
  };
