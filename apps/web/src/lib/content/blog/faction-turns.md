---
id: faction-turns
slug: faction-turns
title: "Faction Turns: Rules, Play Guide, and Living Reference"
description: "A living reference for Codex Cryptica Faction Turns: current rules, resolution, privacy, inspiration, and planned directions."
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
image: "https://assets.codexcryptica.com/images/blog/faction-turns/faction-turns-hero.png"
imageAlt: "A faction turn outcome in Codex Cryptica, showing the reasoning behind the result"
---

![Faction Turns](https://assets.codexcryptica.com/images/blog/faction-turns/faction-turns-hero.png)

When the party spends three sessions under a ruined city, the factions above it should not have to wait politely for them to return. But a campaign tool that moves the world without showing its work is worse than no tool at all: it can quietly overwrite the setting you built.

Faction Turns give an opted-in faction a paced action between sessions, resolve it with visible rules, and show a preview before anything changes. The GM chooses the faction, action, and target. The GM decides whether the result becomes part of the world.

This is a living reference for the system as it exists now. It records the current rules first and separates them from future directions, so it can be revised as the action catalogue grows.

## Current system at a glance

| Rule | Current behaviour |
| --- | --- |
| Participation | Per faction, and fully opt-in. Ordinary factions remain ordinary factions. |
| Turn pace | Monthly by default, or quarterly. The campaign’s own date is always read, never changed. |
| Current action | **Extend influence**. |
| Required stat | **Influence** for the acting faction. **Stability** only matters when the target is a turn-enabled faction. |
| Resolution | Opposed 1d10 rolls by default, or deterministic comparison when dice are off. |
| Results | Decisive success, success, mixed, failure, or backfire. |
| Persistence | Resolve → review → apply or discard. The latest applied turn can be undone. |
| AI | Optional narration and bounded outcome adjustment. Mechanics, eligibility, and world writes stay local and rule-bound. |

## The idea behind it

The strongest design influence is the faction play in Kevin Crawford’s [*Stars Without Number: Revised Edition*](https://sine-nomine-publishing.myshopify.com/products/stars-without-number-revised). Its faction rules model background conflicts so that a GM has news, pressure, and opportunities for the PCs to encounter. The publisher describes them as a way to give a sector life and motion, rather than a setting that remains frozen until the PCs arrive.

That is the influence, not the rules implementation. *Stars Without Number* is a complete science-fiction game with its own Force, Cunning, and Wealth ratings; faction assets; bases; currency; goals; and a broad action economy. Codex Cryptica is system-neutral. It starts from your vault’s existing entities, relationships, stats, chronology, and timeline. It does not copy SWN’s asset catalogue or assume a space map, an economy, or a particular genre.

The useful question from faction play is simple: **what did this group do while the PCs were elsewhere, and what consequence might matter at the table?**

For example:

- The Golden Blood attempt to extend their influence over a market town while the party explores a buried temple.
- A rival already has a strong hold on the town, so the attempt is harder than moving into an unclaimed place.
- The result gives the GM something concrete to use: a new favour owed, resistance to the faction’s agents, a local rumour, or a reason for merchants to seek help.

The turn produces a proposal. It does not decree the story.

## 1. Turn a faction on and give it meaningful stats

Open a faction and choose **Turns**, then turn Faction Turns on. Nothing is added to factions you leave alone.

The built-in **Faction Turns** stat sheet is the quickest way to start. It provides four number stats on a 0–20 scale. Those values are a campaign scale, not an objective measure of what a faction “really is.” A village council with Influence 8 can be formidable in its district; an empire with Influence 14 may be powerful but distracted and overextended. Consistency inside your own world matters more than any universal meaning for the numbers.

| Role | What it can mean in your setting | Used by current rules | Possible names on a custom sheet |
| --- | --- | --- | --- |
| **Influence** | Politics, faith, reputation, persuasion, cultural reach | The acting value for **Extend influence** | Standing, Political Reach, Renown, Cultural Pull |
| **Stability** | Cohesion, legitimacy, discipline, resistance to outside pressure | The resistance value for a turn-enabled faction targeted by Influence | Loyalty, Resolve, Social Cohesion, Morale |
| **Power** | Force, coercion, military reach, direct action | Not yet used by a shipped action | Fleet Strength, Arms, Arcane Might, Enforcement |
| **Resources** | Wealth, territory, logistics, industry, supply | Not yet used by a shipped action | Coin, Holdings, Industry, Supply Lines |

The built-in sheet maps these roles automatically and displays the values on the Turns tab. If you use a custom sheet, map your number fields to the roles there. The mapping remembers the field itself, so renaming *Political Reach* later does not break a faction’s setup.

Only map what an action needs. Influence is enough to act today. Map Stability as well when you want that faction to resist other factions’ influence. Power and Resources are deliberately visible now because future actions will use them; they do not secretly alter the current Influence result.

## 2. Pace turns with campaign time, not real time

Faction Turns use your campaign’s current date. They never use your computer’s date as a substitute, and they never advance campaign time for you.

Set a campaign date with a current-date event or the vault’s current-date setting. A deliberately visible event title such as `*** CURRENT Date ***` is fine: the important part is that the vault can recognise it as the current date. If the vault has no campaign date, the Turns tab explains that turns cannot yet be scheduled. It does not quietly stamp the history with today’s real-world date.

In **Vault Settings → Faction Turns**, choose one of two rhythms:

| Cadence | Best for | Effect |
| --- | --- | --- |
| **Monthly** (default) | Active sandboxes, travel-heavy campaigns, or political games | A faction can normally act again after one month of campaign time. |
| **Quarterly** | Longer travel scales or tables that want fewer, larger developments | A faction can normally act again after three months of campaign time. |

After an applied turn, the tab records the full campaign date of the turn and the date when that faction may act again. You can still override the schedule when the fiction demands it—for example, a crisis forces an immediate response—but the history marks that the action happened early.

The system is deliberately not an automatic calendar simulator. Move the date when your campaign moves. Factions become eligible as a consequence.

## 3. The current action: Extend influence

Choose **Extend influence** on a faction’s Turns tab, then choose a target from the vault. The target may be a character, location, faction, or another world entity. The acting faction cannot target itself. Events and notes are excluded because they are records and reference material, not things a faction can hold influence over.

An Influence turn always asks the same question: **can this faction increase its hold on this target?** That hold is represented by the directed relationship from the acting faction to the target. It does not rewrite the reverse relationship. If a town admires a faction, that is not automatically the same as the faction holding the town.

### How opposition is found

The system checks the following sources in order:

| Situation | Opposition |
| --- | --- |
| The target is a turn-enabled faction with Stability mapped | The target’s Stability. |
| Another turn-enabled faction already has a directed hold on the target | The vault baseline plus a bonus based on the strongest existing rival hold. Stronger holds make the target harder to move. |
| Nobody holds the target | The vault-wide baseline opposition, currently 5 by default. |

This makes the entity graph matter. Influencing an unclaimed settlement is a different proposition from prising a province out of a rival’s grip.

### Dice, totals, and outcome bands

With **Roll dice for outcomes** enabled, both sides roll 1d10. The acting faction adds its Influence; the opposition adds its resistance. With dice disabled, the same comparison is made directly from the values, so unchanged inputs always produce the same result.

The margin is acting total minus opposing total:

| Final margin | Outcome | Relationship-strength change | Acting Influence change |
| ---: | --- | ---: | ---: |
| 8 or more | **Decisive success** | +0.20 | +2 |
| 1 to 7 | **Success** | +0.10 | +1 |
| 0 | **Mixed** | +0.02 | 0 |
| -1 to -7 | **Failure** | -0.10 | -1 |
| -8 or less | **Backfire** | -0.20 | -2 |

Relationship strength is bounded from 0 to 1, and stats respect the minimum and maximum you set on their fields. The preview tells you when a value is capped rather than silently hiding it.

The mixed result is intentionally small rather than empty. Something shifted, but not enough to establish clear control. That is often the most interesting source of adventure pressure: a faction has a toe in the door, a local contact, or a public dispute, but not a settled victory.

Use **Show the working** to inspect the acting stat, opposition source, rolls when applicable, totals, mechanical band, and the permitted final range. Nothing about the resolution is meant to be a black box.

### Relationship type remains yours

The system normally changes strength, not relationship type. In the current rules, a decisive success on an existing neutral relationship may suggest **friendly**; a backfire may suggest **enemy**. That is a suggestion presented in the preview. It only changes the type if you explicitly opt in. A dice result must not silently rewrite a relationship you authored.

## 4. AI is optional and bounded

AI can help in two independent ways:

1. **Write the account**: turn the resolved result into a short narrative account.
2. **Adjust the outcome band**: choose a final band at most one step above or below the mechanically calculated band, with a reason drawn from the situation.

Both options are enabled by default, but either can be turned off in vault settings. AI cannot choose a target, decide whether a faction is eligible, change a stat, alter relationship strength, advance the clock, or select a band outside the mechanically permitted range. The final band determines the tabled changes above; the AI does not invent a different magnitude.

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

## What Faction Turns do not do—yet

This is deliberately one complete action, not a hidden promise of a full simulation game. Current Faction Turns do **not**:

- batch-resolve every faction in the vault;
- choose a faction’s goals, actions, or targets;
- create or manage faction assets;
- run attacks, fortification, recovery, negotiation, schemes, acquisition, or goal pursuit;
- advance the campaign clock;
- automatically create timeline events or adventure hooks;
- expose faction state to Oracle, Adventure Mode, or the AI GM; or
- overwrite your entities, relationships, or notes without a preview and approval.

## Where the reference will grow

The follow-up work is visible rather than implied. Each item needs its own specification before implementation, because every new action must define its stat roles, valid targets, exact writes, preview and undo rules, AI boundary, and tests.

- [Fortify](https://github.com/eserlan/Codex-Cryptica/issues/2415) and [Recover](https://github.com/eserlan/Codex-Cryptica/issues/2422) will explore self-directed actions and give Resources/Stability active roles.
- [Attack](https://github.com/eserlan/Codex-Cryptica/issues/2416) will make Power consequential without prematurely requiring a full asset-combat game.
- [Negotiate](https://github.com/eserlan/Codex-Cryptica/issues/2417) will explore explicit agreements and bilateral relationships.
- [Faction assets](https://github.com/eserlan/Codex-Cryptica/issues/2418), [goals](https://github.com/eserlan/Codex-Cryptica/issues/2419), and [schemes with durable conditions](https://github.com/eserlan/Codex-Cryptica/issues/2420) are the foundations for richer long-term play.
- A [campaign world-turn digest](https://github.com/eserlan/Codex-Cryptica/issues/2421) can later collect already-approved developments without becoming automatic simulation.

Those are directions, not current rules. This guide should change only when an action is specified, implemented, tested, and made visible to GMs.

Start small: give one faction an Influence stat, choose one target when the campaign date moves, read the working, and keep only the consequence that makes your next session more alive. The system should create material for your judgement—not replace it.

