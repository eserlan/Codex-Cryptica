---
id: random-tables-decks
title: Roll Tables & Card Decks
description: Keep your encounter tables, loot lists and oracle decks in the vault, and roll them mid-session.
icon: icon-[lucide--dices]
rank: 28
tags: ["tables", "decks", "rolling", "cards", "oracle", "offline"]
---

# Roll Tables & Card Decks

Every table you have ever scribbled on an index card — wandering monsters, tavern names, what the storm blew in — can live in your vault and be rolled without leaving the app. Decks work the same way, but deal cards instead of rolling.

None of this involves AI, and none of it needs a connection. It is dice and your own writing.

## Making a table

Open **Rolls & Decks**, click **New table**, and start adding entries. A table with entries can be rolled straight from the editor, so you can try it as you write it.

Two ways to control how often something comes up:

- **Weights** — give an entry a weight of 3 and it is picked three times as often as an entry weighted 1. Leave everything at 1 and it is a flat, even table.
- **Ranges** — give explicit numbers instead: 1–70 wolves, 71–95 bandits, 96–100 something worse. Use this when you are copying a d100 table you already own and want the numbers to match the book.

You can switch a table between the two and keep your entries.

A weight of **0** is allowed and means what it looks like: keep the entry, never pick it. Useful for the thing you are saving for later.

## One roll, a whole sentence

Put another table's name in braces and a roll will fill it in:

```
A {creature} guarding {treasure}
```

Roll that and you get a full line — the creature comes from your creature table, the treasure from your treasure table. References can nest several deep, so a table can call a table that calls a table.

After the roll you can see **which table produced each part**, and re-roll just the part you did not like without disturbing the rest. If you like the beast but not its hoard, re-roll the hoard.

Two safety rails, both of which tell you plainly what happened:

- If two tables reference each other in a loop, the roll still finishes and says it found a reference loop.
- Nesting stops at 8 levels deep and says so. That is a different message from the loop one, so you can tell which problem you have.

Renaming a table does not update tables that point at it. Before a rename goes through you will be told which tables would break, so you can decide.

## Building a table from something you already have

**Import** takes a paste and turns it into a table. It reads three shapes:

- a plain list, one entry per line
- columns separated by tabs or commas, as you get from a spreadsheet
- a Markdown table

You see every row as it was understood **before anything is saved**, with a note on any row that did not come through cleanly. Fix them, skip them, or remap which column is which, then confirm.

## Getting one back out

**Export** hands you a single table or deck as a file, in one of four shapes:

- **Codex file** — everything, and it imports straight back. This is the one for keeping a copy, or moving a table to another vault.
- **Markdown table** — for pasting into notes or a post.
- **Tab-separated** — for a spreadsheet, or another tool's importer.
- **Plain lines** — just the text, one entry per line.

The three sharing formats carry the words and not much else, so if your table pulls in another table with `{braces}`, you are told which ones before you download — the reference will not resolve for whoever opens it unless you send those too. Card pictures live in your vault and no text file can carry them, so a deck export says how many cards will arrive without their art.

Import takes a file as well as a paste. Hand it a Codex file and the whole thing comes back — entries, weights, spreads, reversed meanings and all. Hand it anything else and the text lands in the paste box, so a `.csv` or `.tsv` sitting on your disk works too.

A file you import is a **copy**. If you already have something by that name, the copy comes in renamed rather than quietly replacing what you had.

## Decks

A deck deals cards instead of rolling entries, and it deals **without replacement** — a drawn card does not come back until you shuffle. Drawn cards sit in the discard pile.

That pile is part of your vault, not your browser session. Close the app mid-session, come back tomorrow, and the deck is exactly as you left it: same cards gone, same cards left. It travels with the vault, so a deck you push to Google Drive arrives on your other device mid-deck.

**Reset** shuffles everything back in. When a deck runs out mid-draw it says so and offers the reshuffle rather than silently dealing nothing.

Cards can also carry:

- **A picture**, stored in your vault like any other image.
- **A reversed meaning** — a second reading shown when the card comes up reversed, for decks where that matters.
- **Spreads** — named positions dealt in one go, like Past / Present / Future. If the deck does not have enough cards left to fill the whole spread, it refuses rather than half-dealing it.

You can paste a whole pile of cards in at once, the same way tables import.

## Rolling from the chat

In the Oracle chat:

```
/table Forest Encounters
/deck Complications
```

The result appears inline in the transcript, where the rest of your session notes are. Add a number to deal several cards at once — `/deck Tarot 3`.

Type a name slightly wrong and you are offered the closest matches rather than handed a silent wrong result. If nothing is close enough to be worth suggesting, it says the lookup failed instead of guessing.

## A note on tables inside tables

When a table references a **deck**, drawing from it that way does not deplete the deck. The reference is asking the deck a question, not dealing from it — so your carefully tracked discard pile is not quietly emptied by an unrelated encounter roll.

## Where it all lives

Tables and decks are plain files in your vault. You can read them, edit them by hand, back them up, and move them between vaults like anything else you have written.
