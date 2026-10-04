---
id: dice-roller
title: Dice Roller
description: Roll dice from a formula or by clicking dice, with advantage, exploding dice, a roll history and rerolls.
icon: icon-[lucide--dices]
tags: [dice, roll, formula, advantage, d20, history, play tools]
rank: 10
---

# Dice Roller

The **Dice Roller** rolls dice on your own device, for any game system. Open it with the dice button in the header. It opens as a floating window you can move and resize.

If you cannot see the dice button, you may be in Guided mode, which hides it. Switch to **Full Toolbox** to bring it back. See [Guided Mode](/help#help/guided-mode).

The window has three tabs: **Dice**, **Decks** and **Tables**. This page is about Dice; Decks and Tables are in [Random Tables and Decks](/help#help/random-tables-decks). Use **Pop out into new window** to move the roller into a window of its own (the floating one closes), or press **Escape** to close the floating window.

## Rolling

There are two ways to build a roll:

- **Click the dice.** The roller has d4, d6, d8, d10, d12, d20 and d100. Click one to start a formula with one of that die. Click it again to add another of the same die, or click a different die to add it to the formula.
- **Type a formula** in the box, for example `2d20kh1 + 5`.

Then press **ROLL**. The formula clears so you can roll again.

If the formula is not valid, a short message appears under the box and nothing is rolled.

### Formula examples

Choose **Formula Help** (the question mark) next to the box to see these:

| Formula    | What it does                          |
| ---------- | ------------------------------------- |
| `2d20kh1`  | Keep highest (advantage)              |
| `2d20kl1`  | Keep lowest (disadvantage)            |
| `4d6!`     | Exploding: a maximum roll rolls again |
| `1d10 + 5` | Add a modifier                        |

Press the **Up** arrow in the formula box to bring back a formula you rolled earlier, and **Down** to move forward again.

## Your results

Each roll appears in **Session History**, newest first, with the total and the individual dice that made it up. Each roll also has:

- **Reroll this formula**, to roll the same formula again.
- **Send to chat**, to share the result in a game session's chat.

Choose **Clear** to empty the history. It clears dice and table results together.

## Using the roller with other tools

- During a [VTT session](/help#help/vtt-session), your rolls are shared with the session chat as you make them.
- If you have a [Session Journal](/help#help/quicknote) running, your dice rolls are added to it automatically.
- In the Oracle chat, `/roll 2d20kh1 + 5` rolls a formula without opening the roller. See [Chat Commands](/help#help/chat-commands).
