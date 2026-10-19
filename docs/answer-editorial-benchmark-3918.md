# Answer drafting benchmark (#3918)

This is an editorial demonstration, not a rewrite of the published pages or proof that future drafts will need fewer corrections. Success means a reader can perform the task without a missing step, misleading rule or irrelevant next action. Schema validity alone cannot establish that.

## Sources and method

Compare the dice article at the exact merged snapshots, not its subsequently edited version:

- [Initial PR #3899 snapshot](https://github.com/eserlan/Codex-Cryptica/blob/1f61d4cfc5d670534199587e462fb12bfda8f9ac/apps/web/src/lib/content/answers/pages/which-dice-do-i-roll-in-dnd-and-when.ts), implementing #3895.
- [Corrected PR #3915 snapshot](https://github.com/eserlan/Codex-Cryptica/blob/58678ae171f1450aa3412387e5a9d8ed9b44ecec/apps/web/src/lib/content/answers/pages/which-dice-do-i-roll-in-dnd-and-when.ts), following #3914.
- Additional samples use repository revision `9fb4374331e2f37db71a9e1980d5c489775c0c1f`: [point-crawl definition](https://github.com/eserlan/Codex-Cryptica/blob/9fb4374331e2f37db71a9e1980d5c489775c0c1f/apps/web/src/lib/content/answers/pages/what-is-a-point-crawl.ts) and [gods/demon-lords distinction](https://github.com/eserlan/Codex-Cryptica/blob/9fb4374331e2f37db71a9e1980d5c489775c0c1f/apps/web/src/lib/content/answers/pages/what-is-the-difference-between-gods-and-demon-lords-in-a-fantasy-world.ts).

For each sample: identify the reader's job, retain the useful distinctions, rewrite the weak passage, and try a concrete reader task. The assessments below are desk reviews, not user testing or an independent editorial sign-off.

## Beginner rules: which dice to roll

Reader: a first-time D&D player holding a character sheet. Job: follow its dice instruction and report the result.

| Question                                      | Initial #3899                                                                                       | Correction #3915                                                                            | Drafting change still needed                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Can the reader resolve the fighter's attack?  | Names +5 and 1d8 + 3 but supplies no actual roll or target.                                         | Clarifies that the listed bonus is used once; still no actual roll, target or damage total. | Give the inputs, arithmetic, comparison and next action.                                            |
| Does an effect always start with a d20?       | Opening and amount section encourage this misleading generalisation.                                | Distinguishes attacks from effects naming dice directly.                                    | Keep that distinction in the excerpt, example and conclusion together.                              |
| Can the reader interpret a percentile result? | Names tens and ones without working a result.                                                       | Supplies 70/3 and 00/0 cases.                                                               | Retain concrete demonstrations rather than replacing them with reassurance.                         |
| Is the advice grounded?                       | Attack-modifier wording can confuse a listed total with its components; few authoritative pointers. | Explains the total bonus and adds edition-labelled publisher links.                         | Verify any version-sensitive rule separately; a source link is not proof every sentence matches it. |
| Does the next link help?                      | Recommends NPC and name generators.                                                                 | Removes those tools.                                                                        | Prefer the beginner cornerstone and character-sheet explanation; no tool is needed.                 |
| Is every section doing useful work?           | Repeated sheet/memory reassurance and an artificial weak/strong contrast.                           | Fixes the redundant memory wording but retains the contrast and explanatory recap.          | Replace the comparison with a walkthrough; remove repeated assurances across sections.              |

### Proposed passage

This replaces the original example, not the whole article:

> Your fighter's sheet lists **+5 to hit** and **1d8 + 3 damage**. The Dungeon Master (DM) gives the target Armour Class (AC) as 15. There are no extra modifiers in this example.
>
> Roll a twenty-sided die (d20). A result of 12 gives **12 + 5 = 17**, so the attack hits. The listed +5 already includes this attack's normal bonuses; do not add them again.
>
> Now roll the listed damage: one eight-sided die (d8). A result of 6 gives **6 + 3 = 9**. Tell the DM that you hit and rolled 9 damage. If the d20 had shown 7, the attack total would be 12: a miss, so this attack would not proceed to its damage roll.
>
> This sequence describes this attack. A healing effect can name its dice directly without an attack roll.

Rules grounding checked on 2026-10-19: the [2024 Basic Rules, Playing the Game](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game) supports attack totals meeting AC and dice notation; [2014 Basic Rules, Combat](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/combat) supports the same ordinary attack sequence. The chosen sheet values and die results are illustrative. The [2024 Potion of Healing](https://www.dndbeyond.com/magic-items/8960641-potion-of-healing) is a direct-dice healing counterexample. This passage makes no claim that edition-specific actions, spells or weapon features are interchangeable.

**Reader task:** resolve the stated hit, then the alternative miss. Expected: 17 hits AC 15; report 9 rolled damage; 12 misses and does not trigger this weapon's damage roll. The rewrite supplies all inputs and introduces abbreviations. It preserves the rule distinction while removing unrelated saving-throw and advantage detours from this example. Those topics can retain their own explanations elsewhere.

**Preventable during drafting:** missing arithmetic, repeated reassurance, artificial comparison, unrelated tools and undefined abbreviations. **Independent verification remains:** the sheet's bonus composition, applicable exceptions, edition-specific rule claims and whether the whole article teaches the remaining dice uses accurately. The worked task is evidence of a complete example, not a claim that the full article is now verified.

## Definition: what is a point crawl?

Reader: a GM encountering the term. Job: recognise the structure and distinguish it from free exploration of a hex map.

The existing definition and routes with distinct costs are useful. Its six-point example names only four locations; the checklist also makes hidden links and differing outgoing costs sound compulsory, although the component description calls hidden links optional. A definition should separate what makes the structure from advice for making its choices interesting. Broad claims about hex maps burying choices need qualification rather than being part of the definition.

### Proposed passage

> A point crawl represents named locations as points and the routes between them as links. At Ashfoot Ferry, the party can reach the Drowned Chapel by a half-day ferry journey or a two-day fen path. The ferryman reports passengers to the reeve; the slower path avoids that scrutiny. The players choose which cost they prefer.
>
> Those are two locations with two routes between them. A larger network can add more places, loops or hidden routes, but a hidden route is optional. If the question is where the party can travel from here, the links answer it; if play centres on discovering what lies in any direction, a hex map may serve that job better.

**Reader task:** identify the points, the links and the cost of avoiding the reeve. Expected: ferry and chapel are locations; ferry journey and fen path are routes; avoiding scrutiny takes longer. A map without a secret route still fits the definition. This removes the unexplained location count and a compulsory prep checklist while keeping a concrete decision.

**Link/product decision:** the neighbouring comparison `point-crawl-vs-hex-crawl` directly serves the next choice and already has discovery overlap metadata. A point-crawl generator may help someone who next wants to build a network, but a reader learning the term needs no generator or product section. Do not automatically recommend every location or encounter tool.

**Preventable during drafting:** inconsistent example counts, a checklist turning optional design advice into requirements, and repetition between definition and setup. **Independent verification remains:** whether the mapping distinction is fairly explained, the current neighbouring page's suitability, and any claimed graph or generator capability before recommending it. This sample is design advice with invented travel costs, not a published game's mandatory procedure.

## Worldbuilding distinction: gods and demon lords

Reader: a worldbuilder whose supernatural beings overlap. Job: choose a distinction that changes what players encounter, without treating one cosmology as universal.

The existing article already offers setting-dependent definitions and a useful temple/cult dilemma. Preserve those. Its example takeaway repeats the office-versus-predation distinction; the following overlap section and checklist revisit much of the same reasoning. Not all repetition is useless: a checklist earns its place if it produces new preparation decisions. Here a shorter scene can carry the contrast and its consequence without another recap.

### Proposed passage

> In this setting, the god of pestilence holds an office with public duties; the demon lord of worms gains power through bargains. Both can offer help during an outbreak, but their terms differ.
>
> At a flooded village, the temple asks the party to recover a stolen burial register before its protective rites can resume. The cult offers an immediate cure in exchange for bodies delivered to its pits; cured patients develop pale worms beneath their skin. Tell the players what each offer requires and let them investigate the costs before choosing whom to help.
>
> These are invented rules for this setting. Another world might distinguish the beings by origin, succession or worship instead. Choose the difference that creates a consequence you want the players to face.

**Reader task:** name the distinction and prepare the resulting choice. Expected: an office with duties versus a bargain with a cost; retrieve the register or investigate the cult's cure and price. The scene gives the GM something visible to present and preserves uncertainty about the players' decision. It does not need a weak GM, a universal power ranking or a separate “Why it works” paragraph.

**Link/product decision:** the pantheon and fictional-religion Answers help develop divine relationships and mortal practice. A generic generator is unnecessary. A product connection could follow only if the writer verifies a capability that helps record this particular preparation; the demonstration does not assume it.

**Preventable during drafting:** duplicated explanation and unjustified universal cosmology. **Independent verification remains:** whether the offers are understandable and actionable at the table, whether investigation can reveal the costs, and whether references to a named game's gods actually match its lore. This example invents a setting; it does not claim authoritative D&D cosmology.

## Assessing later drafts

Have an independent reader try the stated task using only the draft. Record missing inputs, misunderstood boundaries, unsupported facts and irrelevant next actions alongside the draft's source revision. Classify substantive post-merge `copy-fix` findings by those reader problems and inspect whether the guidance would have prevented them. A green schema check, fewer reported findings or a completed checklist does not establish improvement. Keep legitimate findings and the existing correction loop; do not introduce an arbitrary word limit, trim percentage or automated prose score.
