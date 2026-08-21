---
id: faction-turns
title: Faction Turns
description: Let a faction act on your world between sessions, with outcomes you can inspect, approve and undo.
icon: icon-[lucide--users]
rank: 13
tags: ["factions", "campaign", "turns", "world", "simulation"]
---

# Faction Turns

Most campaign worlds sit still between sessions. Faction Turns let a faction pursue something on its own — extending its reach over a place, a person, or a rival — so that when your players come back, the map has moved a little without you having to move it by hand.

Nothing happens automatically. You choose when a faction acts, you see the result before anything is saved, and you can undo it afterwards.

## Turning it on

Open a faction and choose the **Turns** tab, then **Turn on faction turns**. Factions you don't turn on are completely unaffected — no new tabs, no new fields, nothing.

## Naming your stats

A faction acts using its own stats, and you name those yourself. A court-intrigue campaign might call them Standing, Coin and Loyalty; a space opera might use Fleet Strength, Political Reach and Morale.

Add them as **number** stats on the faction's Stats tab, then come back to the Turns tab and say which stat plays which part:

- **Influence** — politics, faith, persuasion. This is the one an Influence action uses.
- **Stability** — cohesion, and how well the faction resists others reaching into _its_ business.
- **Power** and **Resources** — set them if you like; nothing uses them yet.

Only the parts an action actually needs have to be set, so you can start with just Influence.

Because the mapping remembers the stat itself rather than its name, renaming "Influence" to "Political Reach" later changes nothing about how turns work.

## When a faction can act

Faction turns are paced by your campaign's current date. A faction that acted recently has to wait before acting again — by default, a year of world time.

Your campaign's current date comes from whichever of these you have:

1. An event titled **Current date**, **Today**, **Now** or similar, with a date on it.
2. The **Present Year** setting in vault settings.

If you have neither, the Turns tab will say so and ask you to set one. It will not quietly use today's real-world date — in a campaign set in the year 640, that would make every faction eligible forever and stamp your history with the wrong year.

**The system never changes your campaign's date.** It only reads it. You move time forward when you're ready, and factions become able to act as a result.

If you want a faction to act ahead of schedule anyway, you can — the turn is simply recorded as having been taken early.

## Taking a turn

Pick a target — any entity in your vault — and choose **Extend influence**. You'll get a result immediately, and **nothing is saved yet**.

The result is one of five outcomes: decisive success, success, mixed, failure, or backfire. Choose **Show the working** to see exactly how it got there: which stat was used, what resisted it and why, what was rolled, and what the outcome could have been.

How hard a target is to influence depends on who already holds it. Somewhere nobody has claimed is the easiest thing in your world to move on; a province a rival faction has a firm grip on is considerably harder.

## Approving, or throwing it away

The preview shows what will change: the faction's stat, and how firmly it holds the target. You can rewrite the account in your own words before saving it.

- **Apply this turn** saves everything and adds it to the faction's history.
- **Throw it away** leaves your vault exactly as it was.

If an outcome suggests the relationship itself has changed character — a neutral arrangement becoming friendly, say — you'll be offered that as a tickbox. It never happens on its own, because a relationship you wrote deliberately shouldn't be overwritten by a dice roll.

Leaving the tab with an unsaved result will ask you to confirm, and reloading the page discards it. Results are never saved half-finished.

## Undoing

The most recent turn can be undone from the history list, which puts the stat and the relationship back exactly as they were. Undone turns stay visible in the history, marked as undone, rather than disappearing.

Only the most recent turn can be reversed. Undoing an older one would mean guessing how to reconcile everything that happened since, and a wrong guess there would quietly damage a world you wrote by hand.

## History, and your timeline

Every turn is kept, permanently and in full, so you can still see the reasoning behind a turn taken years of campaign time ago.

Turns do **not** appear on your campaign timeline unless you put them there. A faction's routine manoeuvring would swamp the events you actually care about. When something _does_ matter, choose **Add to timeline** and it becomes a proper event alongside your hand-written history.

## Using AI, or not

Two separate settings in vault settings, both on by default:

- **Let AI write the account** — describes the outcome in prose rather than a stock sentence.
- **Let AI adjust the outcome** — lets AI shift an outcome one step better or worse when the situation warrants it, and it has to say why. The dice still decide the starting point.

When either is on, **the faction's and the target's names and short descriptions are sent to your AI provider.** Turn them off and nothing leaves your device: outcomes are described locally instead, and everything else works exactly the same.

Faction turns never wait on AI. If your provider is slow, unreachable, or you have none set up, the dice result stands and the turn is described locally.

## If you want no randomness at all

Turn off **Roll dice for outcomes** and results are decided by comparing stats directly. With that off and AI adjustment off too, the same situation always produces the same outcome.
