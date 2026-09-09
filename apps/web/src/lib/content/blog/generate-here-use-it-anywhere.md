---
id: generate-here-use-it-anywhere
slug: generate-here-use-it-anywhere
title: "Generate Here. Use It Anywhere."
description: "Codex Cryptica generators produce Markdown and rich text that work outside Codex, no Vault required. Here is what is actually portable today, what MonsterLabs adds, and what is still on the roadmap."
keywords:
  [
    "export RPG generator results",
    "RPG generator markdown",
    "printable RPG generator",
    "export worldbuilding notes",
    "use AI RPG generator with VTT",
    "RPG generator for Obsidian Notion Google Docs",
    "portable worldbuilding tools",
    "RPG tools that work with existing campaign workflow",
  ]
publishedAt: 2026-09-09T15:00:00Z
---

Most GMs already have a workflow. A note app they like, a wiki the group can search, a VTT they have spent years learning, maybe a battered folder of printed handouts that has survived three campaigns. That workflow is not a problem to be solved. It is not something a new tool gets to override just because it also happens to write good NPCs.

A worldbuilding tool that only works if you abandon everything else is asking for a lot in exchange for a name generator. Codex Cryptica is built the other way round.

## Generate here. Use it anywhere.

Every generator on the site, NPCs, factions, quests, settlements, items, produces content that is useful the moment it exists, not after you have created an account and moved your campaign in. You do not need a Vault to get a usable result out of Codex Cryptica. You need it if you want the connected, searchable version of your world; you do not need it to walk away with a good NPC.

That distinction runs through everything below.

## Markdown

Every generator result has a Copy action, and what it puts on your clipboard is clean Markdown: headings, bold labels, lists, nothing decorative bolted on. Paste it into Obsidian, a plain-text notes repo, a static site, anywhere that treats Markdown as the native format, and it lands as source, not as a screenshot pretending to be text.

This is the boring, load-bearing case. If your whole campaign already lives as `.md` files in a folder you control, Codex Cryptica generators are a source of new files for that folder, not a competing home for them.

## Rich text and normal documents

The same Copy button also writes a formatted version to your clipboard alongside the plain Markdown, so pasting into Google Docs, Word, Notion, or a wiki editor gives you real headings and bold text instead of raw asterisks you have to clean up by hand. One click, two formats, whichever the destination actually wants.

## PDF and print

Codex Cryptica does not generate PDFs itself, and this article is not going to pretend it does. What it does is produce content clean enough that the PDF step is trivial: paste a generated faction roster or rumour table into the document editor you already use, and export or print from there. Digital generation feeding a printed reference sheet, GM screen insert, or table handout is not a workaround. For a lot of tables it is simply how the sheet ends up on paper.

## VTTs and campaign tools

Codex Cryptica has its own lightweight VTT built directly on top of your vault, so a location or encounter you have written can become a playable map with tokens without leaving the app. That is one option, not the only one.

What Codex Cryptica does not yet do is export directly into a third-party VTT's native stat block format. Getting content into Foundry or Roll20 today means the same Markdown or rich-text paste covered above, not a dedicated import file. That is a real gap, not a secret one, and it is a fair target for where integrations should go next rather than something to gloss over.

## Partner integrations: MonsterLabs as the first example

The clearest example of interoperability as a design choice, rather than an accident of clipboard support, is the MonsterLabs collaboration. Codex Cryptica is a fiction-first tool: it is good at the creature's name, its history, why it is guarding this particular ruin, what it wants. It is not trying to be a D&D 5e rules engine, and pretending otherwise would mean doing a worse job of both halves.

MonsterLabs is a D&D 5e rules engine. So a Character or Creature entity or draft in Codex Cryptica now carries a "Create D&D monster in MonsterLabs" action, and an Item gets the matching "Create D&D magic item in MonsterLabs" action, that hands your name, type, and description straight to MonsterLabs' generator in a new tab, ready to become a real stat block. Codex stays open behind it. Nothing is deleted or moved, just sent.

The reverse trip, pulling a finished MonsterLabs stat block back into a Codex stat sheet automatically, is on the roadmap and not shipped yet. Today the handoff runs one direction: your fiction out to a tool built specifically to turn it into mechanics. That is still the point. Codex does not need to reproduce what a specialised tool already does well; it needs to hand off to it cleanly.

## Vaults are an option, not a requirement

Worth repeating plainly: nothing above requires a Vault. Type your inputs into any generator, get a result, copy it, and you are done, with nothing saved and nothing to clean up later if you never open Codex Cryptica again.

Save to Codex sits next to Copy as one more button, not a gate in front of it. It exists for people who want more: relationships between NPCs and the factions they serve, a location connected to the quest hooks seeded there, a searchable graph of a world built up over dozens of sessions. If that is not what you need yet, or ever, the generators still work exactly the same without it.

## Your campaign should not belong to the tool you used to create it

That is the actual principle underneath the feature list. A worldbuilding tool earns a place in your workflow by fitting into it, not by trying to become all of it. Generate here. Use it anywhere, including nowhere near Codex Cryptica ever again if that is what your table needs.

If you do want the connected version, [start a Vault](/for/sandbox-campaigns) and see what changes when everything is linked instead of loose. If you do not, the [generators](/generators) are right there, no account required.
