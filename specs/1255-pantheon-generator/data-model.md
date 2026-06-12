# Phase 1 Data Model: Pantheon / God Generator

**Branch**: `1255-pantheon-generator` | **Date**: 2026-06-11
**Feature**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/1255-pantheon-generator/spec.md)

## Generator Input Configuration

The inputs passed from Svelte UI to the generator engine:

```typescript
export interface PantheonGeneratorOptions {
  mode: "single" | "pantheon";
  genre?: string;
  divineType?: string;
  domain?: string;
  tone?: string;
  worshippers?: string;
  conflictTheme?: string;
  campaignContext?: string;
  useAI?: boolean;
}
```

## AI Schema & Prompt Outputs

### 1. Single Deity JSON Format

When `mode` is `"single"`, the AI is prompted to return a single deity JSON:

```json
{
  "title": "Name of Deity/Spirit",
  "type": "God / Spirit / Saint / Demon / Ancestor / Abstract Force",
  "summary": "One-sentence defining concept.",
  "content": "Markdown description including appearance, symbols, rituals, taboos, and sacred spaces.",
  "lore": "Markdown GM info detailing myths, divine connections, and adventure hooks.",
  "labels": [
    "rpg-deity",
    "deity-generator",
    "imported-draft",
    "classic-fantasy"
  ]
}
```

### 2. Small Pantheon JSON Format

When `mode` is `"pantheon"`, the AI is prompted to return a pantheon JSON:

```json
{
  "title": "Name of the Pantheon (e.g. The Silent Maw, The Solar Conclave)",
  "summary": "One-sentence summary of the pantheon's main belief system.",
  "content": "Markdown description of the pantheon's origin myth, shared dogmas, and primary conflicts.",
  "deities": [
    {
      "title": "Name of Deity A",
      "type": "God",
      "domains": "War & Fury",
      "summary": "Brief summary.",
      "content": "Markdown description details.",
      "lore": "Markdown GM info."
    },
    {
      "title": "Name of Deity B",
      "type": "Spirit",
      "domains": "Nature & Growth",
      "summary": "Brief summary.",
      "content": "Markdown description details.",
      "lore": "Markdown GM info."
    },
    {
      "title": "Name of Deity C",
      "type": "Ancestor",
      "domains": "Secrets & Shadows",
      "summary": "Brief summary.",
      "content": "Markdown description details.",
      "lore": "Markdown GM info."
    }
  ],
  "relationships": "Markdown description of alliances, rivalries, and conflicts between the deities (using [[Wiki Links]] for deity titles)."
}
```

## Local Storage Import Format

The generator parses the output of the generator engine and converts it to a pending import payload structure stored in `localStorage` under `__codex_pending_import`:

### For Single Deity:

A single `ImportDraft` object:

```json
{
  "type": "character",
  "title": "Solaris the Lightbringer",
  "content": "### Description\n...",
  "lore": "### GM Reference\n...",
  "labels": ["rpg-deity", "deity-generator", "imported-draft"],
  "status": "active"
}
```

### For Small Pantheon:

An array of `ImportDraft` objects:

```json
[
  {
    "type": "faction",
    "title": "The Solar Conclave",
    "content": "### Dogmas & Origin\n...\n### Deities & Conflicts\n- [[Solaris the Lightbringer]] is in conflict with [[Nyx the Shadow Weaver]].",
    "lore": "### GM Reference\n...",
    "labels": ["rpg-pantheon", "pantheon-generator", "imported-draft"],
    "status": "active"
  },
  {
    "type": "character",
    "title": "Solaris the Lightbringer",
    "content": "### Description\n...",
    "lore": "### GM Reference\n...",
    "labels": ["rpg-deity", "pantheon-generator", "imported-draft"],
    "status": "active"
  },
  {
    "type": "character",
    "title": "Nyx the Shadow Weaver",
    "content": "### Description\n...",
    "lore": "### GM Reference\n...",
    "labels": ["rpg-deity", "pantheon-generator", "imported-draft"],
    "status": "active"
  }
]
```
