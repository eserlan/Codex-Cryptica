---
id: default-templates-announcement
slug: default-templates-announcement
title: "No More Blank Pages: Introducing Default Entity Templates"
description: "Start your worldbuilding instantly. Learn how Codex Cryptica's new customizable, theme-aware default templates eliminate note-taking friction and structure your RPG campaigns."
keywords:
  - "RPG World Building Templates"
  - "Default Markdown Formats"
  - "Character Template RPG"
  - "Faction Template RPG"
  - "Codex Cryptica Templates"
  - "Local-First Markdown Note"
publishedAt: 2026-05-28T14:00:00Z
image: "https://assets.codexcryptica.com/images/blog/default-templates/creation-dialog.png"
imageAlt: "Create Entity Dialog with default format option in Codex Cryptica"
---

Starting a new character, location, or faction shouldn't start with staring at a blinking cursor on a blank screen. That cognitive friction, the "blank page syndrome," is the enemy of creative flow.

With the release of **Default Entity Templates**, Codex Cryptica now gives every new note a head start. Start a space smuggler or a ruins complex and your archive fills in a structure built for that entity type.

---

## **Markdown-First, Optional Structure**

In keeping with our local-first, markdown-first philosophy, these templates are **completely non-mandatory guides**, not rigid database fields. They pre-populate the document editor with structured headings, but they remain 100% plain text.

If you don't need a section, delete it. If you want a completely empty slate, you can easily toggle **"Start from default format"** off directly in the creation card.

![Create Entity Toggle Checkbox](https://assets.codexcryptica.com/images/blog/default-templates/creation-dialog.png)

---

## **Tailored to Your Active Theme**

We didn't stop at a single generic outline. Because fantasy adventurers have vastly different needs than cyberpunk deckers, default formats **adapt dynamically to your vault's active theme**:

- **Fantasy Campaign**: Creating a Character populates fields like `Lineage`, `Oaths`, and `Magical Affinity`.
- **Sci-Fi Campaign**: A new Character immediately provides space for `Augmentations`, `Corporate Ties`, and `Street Reputation`.
- **Generic Settings**: Standard fields like `Appearance`, `Personality`, and `Goals` keep you grounded in any setting.

---

## **Take Full Control: Vault-Level Customization**

For worldbuilders, GMs, and writers with specific note-taking frameworks, you can override any built-in system template with your own local markdown files.

Create a folder in your local vault directory named `.cc/templates/` (or `.codex/templates/`) and place a markdown file named after the entity type (e.g., `.cc/templates/character.md`).

### **Plain Markdown — No Metadata or Placeholders Needed**

A common question when creating custom templates is whether you need to include frontmatter or placeholder fields for `type`, `title`, or `labels`.

**You do not.**

In Codex Cryptica, entity metadata (titles, entity types, label chips, and timestamps) is managed automatically by the application interface. When you create a note, you enter the title in the creation dialog and assign your labels in the app header. Your template file is strictly for the **document body**:

```markdown
## Summary

A quick 1–2 sentence summary of who this figure is in the world.

## Appearance & Vibe

Distinctive visual details, attire, voice, and mannerisms.

## Goals & Agenda

What are they actively pursuing right now?

## Key Relationships

Bonds, rivalries, and allegiances to local factions or other entities.

## Secrets & DM Notes

Hidden motives or clues the players haven't uncovered yet.
```

Whenever you create a new Character, Codex Cryptica reads `.cc/templates/character.md` and pre-populates your editor with your custom structure.

### **Supported Template Types**

You can drop custom templates into `.cc/templates/` for any of the standard entity types:

- `character.md`
- `faction.md`
- `location.md`
- `item.md`
- `event.md`
- `creature.md`
- `note.md`

> **Pro Tip:** If you want a specific entity type to _always_ start as a completely blank page without having to uncheck "Start from default format" every time, just create an empty file (e.g., an empty `.cc/templates/note.md`). Codex Cryptica recognizes empty template files as intentional blank canvases.

By keeping your overrides inside your vault, your custom templates sync across devices and stay private, right alongside your lore.
