---
id: faction-turns
slug: faction-turns
title: "Faction Turns: Rules, Play Guide, and Living Reference"
description: "Current Faction Turn rules, worked examples, design amendments, AI boundaries, and the road toward richer faction play."
keywords:
  [
    "Faction Turns",
    "Campaign Management",
    "Living World RPG",
    "GM Tools",
    "Worldbuilding",
    "Sandbox Campaign",
    "TTRPG Factions",
    "Stars Without Number",
    "Codex Cryptica",
  ]
publishedAt: 2026-08-22T10:00:00Z
---

When the party spends three sessions under a ruined city, the factions above it should not have to wait politely for them to return. But a campaign tool that moves the world without showing its work is worse than no tool at all: it can quietly overwrite the setting you built.

Faction Turns give an opted-in faction a paced action between sessions, resolve it with visible rules, and show a preview before anything changes. The GM chooses the faction, action, and target. The GM decides whether the result becomes part of the world.

This is a living reference for the system as it exists now **and for the rules direction being tested next**. Where the shipped vertical slice and the intended mature rule differ, this guide says so directly.

> **Reference status:** Rules draft 0.2, verified against feature 161 on August 22, 2026. Current behaviour is marked separately from proposed amendments.

## In this guide

- [Current system at a glance](#current-system-at-a-glance)
- [Stats and what their numbers mean](#1-turn-a-faction-on-and-give-it-meaningful-stats)
- [Campaign time and eligibility](#2-pace-turns-with-campaign-time-not-real-time)
- [Extend influence and opposition](#3-the-current-action-extend-influence)
- [A complete worked example](#a-complete-worked-example)
- [AI boundaries](#4-ai-is-optional-and-bounded)
- [Preview, history, timeline, and undo](#5-preview-apply-discard-undo-and-remember)
- [Proposed rules amendments](#proposed-rules-amendments)

## Current system at a glance

| Rule           | Current behaviour                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Participation  | Per faction, and fully opt-in. Ordinary factions remain ordinary factions.                                                      |
| Turn pace      | Monthly by default, or quarterly. The campaign’s own date is always read, never changed.                                        |
| Current action | **Extend influence**.                                                                                                           |
| Required stat  | **Influence** for the acting faction. A turn-enabled faction resists with **Stability** when that role is mapped.               |
| Resolution     | Opposed 1d10 rolls by default, or deterministic comparison when dice are off.                                                   |
| Results        | Decisive success, success, mixed, failure, or backfire.                                                                         |
| Persistence    | Resolve → review → apply or discard. The latest applied turn can be undone.                                                     |
| AI             | Optional narration and optional bounded outcome adjustment. The current default and proposed safer default are explained below. |

## The idea behind it

The strongest design influence is the faction play in Kevin Crawford’s [_Stars Without Number: Revised Edition_](https://sine-nomine-publishing.myshopify.com/products/stars-without-number-revised). Its faction rules model background conflicts so that a GM has news, pressure, and opportunities for the PCs to encounter. The publisher describes them as a way to give a sector life and motion, rather than a setting that remains frozen until the PCs arrive.

That is the influence, not the rules implementation. _Stars Without Number_ is a complete science-fiction game with its own Force, Cunning, and Wealth ratings; faction assets; bases; currency; goals; and a broad action economy. Codex Cryptica is system-neutral. It starts from your vault’s existing entities, relationships, stats, chronology, and timeline. It does not copy SWN’s asset catalogue or assume a space map, an economy, or a particular genre.

The useful question from faction play is simple: **what did this group do while the PCs were elsewhere, and what consequence might matter at the table?**

For example:

- The Golden Blood attempt to extend their influence over a market town while the party explores a buried temple.
- A rival already has a strong hold on the town, so the attempt is harder than moving into an unclaimed place.
- The result gives the GM something concrete to use: a new favour owed, resistance to the faction’s agents, a local rumour, or a reason for merchants to seek help.

The turn produces a proposal. It does not decree the story.

## 1. Turn a faction on and give it meaningful stats

Open a faction and choose **Turns**, then turn Faction Turns on. Nothing is added to factions you leave alone.

The built-in **Faction Turns** stat sheet is the quickest way to start. It provides four number stats on a 0–20 scale. Those values are a campaign scale, not an objective measure of what a faction “really is.” A village council with Influence 8 can be formidable in its district; an empire with Influence 14 may be powerful but distracted and overextended.

| Role          | What it can mean in your setting                                 | Used by current rules                                                 | Possible names on a custom sheet                 |
| ------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| **Influence** | Politics, faith, reputation, persuasion, cultural reach          | The acting value for **Extend influence**                             | Standing, Political Reach, Renown, Cultural Pull |
| **Stability** | Cohesion, legitimacy, discipline, resistance to outside pressure | The resistance value for a turn-enabled faction targeted by Influence | Loyalty, Resolve, Social Cohesion, Morale        |
| **Power**     | Force, coercion, military reach, direct action                   | Not yet used by a shipped action                                      | Fleet Strength, Arms, Arcane Might, Enforcement  |
| **Resources** | Wealth, territory, logistics, industry, supply                   | Not yet used by a shipped action                                      | Coin, Holdings, Industry, Supply Lines           |

The following benchmarks are a starting point for a single campaign, not a claim that every world must measure power identically:

|     Value | Suggested meaning on your campaign's scale |
| --------: | ------------------------------------------ |
|     **0** | Incapable in this area                     |
|   **1–2** | Barely present or severely impaired        |
|   **3–5** | Weak, small, or strictly local             |
|   **6–8** | Established local actor                    |
|  **9–11** | Strong regional actor                      |
| **12–15** | Major power                                |
| **16–18** | Setting-defining power                     |
| **19–20** | Exceptional or near-hegemonic              |

These values matter. Opposed d10 rolls can differ by at most 9. An advantage of 10 therefore guarantees at least a success, while a disadvantage of 10 makes success impossible. Start most active factions in the middle of the scale unless you deliberately want near-certain dominance or impotence. The exact ranges remain a playtesting surface rather than settled universal balance.

The built-in sheet maps these roles automatically and displays the values on the Turns tab. If you use a custom sheet, map your number fields to the roles there. The mapping remembers the field itself, so renaming _Political Reach_ later does not break a faction’s setup.

Only map what an action needs. Influence is enough to act today. Map Stability as well when you want that faction to resist other factions’ influence. Power and Resources are deliberately visible now because future actions will use them; they do not secretly alter the current Influence result.

## 2. Pace turns with campaign time, not real time

Faction Turns use your campaign’s current date. They never use your computer’s date as a substitute, and they never advance campaign time for you.

Set a campaign date with a current-date event or the vault’s current-date setting. A deliberately visible event title such as `*** CURRENT Date ***` is fine: the important part is that the vault can recognise it as the current date. If the vault has no campaign date, the Turns tab explains that turns cannot yet be scheduled. It does not quietly stamp the history with today’s real-world date.

In **Vault Settings → Faction Turns**, choose one of two rhythms:

| Cadence               | Best for                                                            | Effect                                                                |
| --------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Monthly** (default) | Active sandboxes, travel-heavy campaigns, or political games        | A faction can normally act again after one month of campaign time.    |
| **Quarterly**         | Longer travel scales or tables that want fewer, larger developments | A faction can normally act again after three months of campaign time. |

Eligibility belongs to each faction; there is no global initiative order and no automatic “resolve the world” button. A newly enabled faction with no earlier turn is immediately schedule-eligible once the vault has a campaign date. Resolving Extend Influence still requires its Influence role to be mapped.

After an applied turn, the tab records the full campaign date of the turn and the date when that faction may act again. You can still override the schedule when the fiction demands it—for example, a crisis forces an immediate response—but the history marks that the action happened early. An override does not move the campaign clock. Undoing the latest turn makes eligibility depend on the latest remaining turn that has not been undone.

The system is deliberately not an automatic calendar simulator. Move the date when your campaign moves. Factions become eligible as a consequence.

## 3. The current action: Extend influence

Choose **Extend influence** on a faction’s Turns tab, then choose a target from the vault. The target may be a character, location, faction, or another world entity. The acting faction cannot target itself. Events and notes are excluded because they are records and reference material, not things a faction can hold influence over.

An Influence turn always asks the same question: **can this faction increase its hold on this target?** A hold means leverage, access, authority, presence, dependency, or control over the target. It is not necessarily affection or ownership.

The current vertical slice stores that hold as the strength of the directed relationship from the acting faction to the target. It does not rewrite the reverse relationship. If a town admires a faction, that is not automatically the same as the faction holding the town.

That reuse keeps the first implementation small, but it also exposes an ambiguity: an ordinary authored connection such as **enemy of**, **participant in**, or **family of** does not automatically mean political hold. The proposed mature rule therefore requires faction influence to be explicitly identified as a hold instead of treating every outgoing faction connection as one.

### How opposition is found

The system checks the following sources in order:

| Situation                                                              | Opposition                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| The target is a turn-enabled faction with Stability mapped             | The target’s Stability.                                                                                                    |
| Another turn-enabled faction already has a directed hold on the target | The vault baseline plus a bonus based on the strongest existing rival hold. Stronger holds make the target harder to move. |
| Nobody holds the target                                                | The vault-wide baseline opposition, currently 5 by default.                                                                |

The current rival-hold calculation is:

`opposition = baseline + (6 × strongest rival hold)`

Hold strength runs from 0 to 1, so the default baseline of 5 can rise to 11. Only the strongest other turn-enabled faction counts; weaker rival holds do not stack. This keeps the calculation legible, though playtesting may later show that several smaller rivals should matter differently.

If a turn-enabled faction has no Stability role mapped, it does not resist with a hidden default Stability. The calculation falls through to the strongest explicit rival hold or the vault baseline. The preview should make that fallback conspicuous so a forgotten mapping does not look like intentional weakness.

This makes the entity graph matter. Influencing an unclaimed settlement is a different proposition from prising a province out of a rival’s grip. Under the proposed amendment, only relationships explicitly marked as faction holds contribute to this calculation.

### Dice, totals, and outcome bands

With **Roll dice for outcomes** enabled, both sides roll 1d10. The acting faction adds its Influence; the opposition adds its resistance. With dice disabled, the same comparison is made directly from the values, so unchanged inputs always produce the same result.

The margin is acting total minus opposing total:

| Final margin | Outcome              | Hold-strength change | Current acting Influence change |
| -----------: | -------------------- | -------------------: | ------------------------------: |
|    8 or more | **Decisive success** |                +0.20 |                              +2 |
|       1 to 7 | **Success**          |                +0.10 |                              +1 |
|            0 | **Mixed**            |                +0.02 |                               0 |
|     -1 to -7 | **Failure**          |                -0.10 |                              -1 |
|   -8 or less | **Backfire**         |                -0.20 |                              -2 |

Relationship strength is bounded from 0 to 1, and stats respect the minimum and maximum you set on their fields. The preview tells you when a value is capped rather than silently hiding it.

The mixed result is intentionally small rather than empty. Something shifted, but not enough to establish clear control. That is often the most interesting source of adventure pressure: a faction has a toe in the door, a local contact, or a public dispute, but not a settled victory.

Use **Show the working** to inspect the acting stat, opposition source, rolls when applicable, totals, mechanical band, and the permitted final range. Nothing about the resolution is meant to be a black box.

### A complete worked example

The Golden Blood have **Influence 8** and try to extend their hold over a market town. The Wandering Stars already have a **0.30 directed relationship** there which the GM intends as a hold. Under the proposed rule, that intent would be marked explicitly.

1. Baseline opposition is 5.
2. The rival hold adds `6 × 0.30`, or 1.8, for total opposition of 6.8.
3. The Golden Blood roll 6 and reach an acting total of 14.
4. Opposition rolls 3 and reaches 9.8.
5. The final margin is `14 − 9.8 = 4.2`, which is **Success**.
6. The preview proposes moving the Golden Blood's hold from 0 to 0.10 and records the full working.

In the current vertical slice, that success also raises the Golden Blood's Influence from 8 to 9. Under the proposed amendment below, Influence would remain 8: the action establishes hold over this target but does not permanently improve the capability used to win future actions.

### Relationship type remains yours

The system normally changes strength, not relationship type. In the current vertical slice, a decisive success on an existing neutral relationship may suggest **friendly**; a backfire may suggest **enemy**. That suggestion appears in the preview and only changes the type if you explicitly opt in.

The proposed rule removes those generic suggestions. Influence can describe friendship, coercion, debt, infiltration, fear, patronage, or occupation. Success does not prove that a target is friendly, and backfire does not prove that it has become an enemy. Relationship type should follow the declared fictional intent and remain a deliberate GM choice.

## 4. AI is optional and bounded

AI can help in two independent ways:

1. **Write the account**: turn the resolved result into a short narrative account.
2. **Adjust the outcome band**: choose a final band at most one step above or below the mechanically calculated band, with a reason drawn from the situation.

In the current vertical slice, both options are enabled by default, but either can be turned off in vault settings. The proposed safer default keeps AI narration available while making mechanical band adjustment explicitly opt-in. A one-band shift changes the world state, not just the prose, so the GM should knowingly enable that authority.

When band adjustment is enabled, the mechanical result defines the permitted range. A mechanical **Success**, for example, lets AI select **Decisive success**, **Success**, or **Mixed**—never **Failure** or **Backfire**. AI cannot choose a target, decide whether a faction is eligible, advance the clock, or invent its own stat or hold magnitude. The selected final band determines the tabled changes above.

When AI is used normally, the request includes the acting faction’s and target’s names and short descriptions. **Include participant lore with AI** is off by default. If you enable it, that one request also includes each participant’s aliases, up to 1,200 characters of their text and lore, and up to five named outgoing connections. It does not send the rest of the vault.

AI output is always draft material until you accept the turn. You can edit the narrative before applying it. If the provider is slow, unavailable, rate-limited, malformed, or returns an impermissible band, the mechanical result stands and a local narrative template is used instead. A faction turn does not fail because AI is unavailable.

## 5. Preview, apply, discard, undo, and remember

Resolving a turn creates a transient preview. It is not saved, synced, or restored after a reload. Leaving the view asks for confirmation before discarding it; reloading discards it.

From the preview, you can:

- **Apply this turn** to write the shown stat and relationship changes and append a permanent history record.
- **Throw it away** to leave the vault untouched.
- Edit the narrative account before applying it.
- Opt into a suggested relationship-type change when one is offered.

At commit time, the system checks that the relevant faction stat and relationship have not changed since the preview was made. If they have, it asks you to re-resolve instead of overwriting a newer edit. Applying a turn is atomic: if one part cannot be written, the already-applied parts are rolled back and no misleading history record is left behind.

The most recently applied turn can be **undone**. Undo restores the affected stat and relationship to their exact earlier values. The history entry remains visible and is marked undone. Older turns cannot be undone directly, because safely reversing one while later turns remain would require the tool to guess how your intervening world changes fit together.

Every applied turn keeps its world date, target, outcome, mechanics, narrative source, AI rationale when applicable, and reversal information. If a turn deserves to become public campaign history, choose **Add to timeline**. That creates a normal event that you can edit like any other; routine faction manoeuvres stay in faction history unless you promote them.

A promoted timeline event is a separate authored entity. In the current implementation, undo warns you about that event but leaves it in place. Remove or revise the event separately if the undone outcome should no longer be campaign history.

## Proposed rules amendments

The vertical slice proved the workflow. It also exposed four rules that should be hardened before more actions depend on them:

1. **A normal Influence action changes hold, not permanent Influence.** Core-stat advancement should come from explicit goals, assets, recovery, or another advancement rule. This avoids runaway winners and failure spirals.
2. **Faction hold must be explicit.** An ordinary authored connection is not automatically political control. Opposition and action effects should use only relationships marked for faction influence.
3. **A failed first attempt must not create an empty relationship.** If the resulting hold is zero, the failed attempt belongs in history but should not leave a neutral zero-strength edge in the graph.
4. **Relationship type follows the fiction.** The system should show the hold change and let the GM deliberately choose any accompanying type change rather than infer friendship from success or enmity from failure.

These are proposed amendments, not a claim that the current build already behaves this way. They are tracked in the [Influence rules and explicit-hold specification](https://github.com/eserlan/Codex-Cryptica/issues/2424). They should be specified, tested against real campaign data, and then reflected here as settled rules. The safer AI default is tracked separately in [the opt-in outcome-adjustment issue](https://github.com/eserlan/Codex-Cryptica/issues/2425).

## What Faction Turns do not do—yet

This is deliberately one complete action, not a hidden promise of a full simulation game. Current Faction Turns do **not**:

- batch-resolve every faction in the vault;
- choose a faction’s goals, actions, or targets;
- create or manage faction assets;
- run attacks, fortification, recovery, negotiation, schemes, acquisition, or goal pursuit;
- provide a complete advancement economy for permanent faction-stat growth;
- advance the campaign clock;
- automatically create timeline events or adventure hooks;
- expose faction state to Oracle, Adventure Mode, or the AI GM; or
- overwrite your entities, relationships, or notes without a preview and approval.

## Where the reference will grow

The follow-up work is visible rather than implied. Each item needs its own specification before implementation, because every new action must define its stat roles, valid targets, exact writes, preview and undo rules, AI boundary, and tests.

- [Fortify](https://github.com/eserlan/Codex-Cryptica/issues/2415) and [Recover](https://github.com/eserlan/Codex-Cryptica/issues/2422) will explore self-directed actions and give Resources/Stability active roles.
- The [Influence rules and explicit-hold specification](https://github.com/eserlan/Codex-Cryptica/issues/2424) must settle the shared mechanical foundation before more actions depend on it.
- [AI outcome adjustment](https://github.com/eserlan/Codex-Cryptica/issues/2425) will become an explicit opt-in, independently of optional AI narration.
- [Attack](https://github.com/eserlan/Codex-Cryptica/issues/2416) will make Power consequential without prematurely requiring a full asset-combat game.
- [Negotiate](https://github.com/eserlan/Codex-Cryptica/issues/2417) will explore explicit agreements and bilateral relationships.
- [Faction assets](https://github.com/eserlan/Codex-Cryptica/issues/2418), [goals](https://github.com/eserlan/Codex-Cryptica/issues/2419), and [schemes with durable conditions](https://github.com/eserlan/Codex-Cryptica/issues/2420) are the foundations for richer long-term play.
- A [campaign world-turn digest](https://github.com/eserlan/Codex-Cryptica/issues/2421) can later collect already-approved developments without becoming automatic simulation.

Those are directions, not current rules. This guide should change only when an action is specified, implemented, tested, and made visible to GMs.

## Reference amendments

| Draft   | Date            | Change                                                                                                                                                          |
| ------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.2** | August 22, 2026 | Added stat calibration, the exact opposition formula, a worked example, eligibility and timeline edge cases, and the proposed hold/stat/AI hardening direction. |
| **0.1** | August 22, 2026 | Recorded the completed Extend Influence vertical slice and its SWN inspiration.                                                                                 |

Start small: give one faction an Influence stat, choose one target when the campaign date moves, read the working, and keep only the consequence that makes your next session more alive. The system should create material for your judgement—not replace it.
