# Feature Specification: Adventure Idea Generator

**Feature Branch**: `147-adventure-canvas-spatial` (encompasses `146-adventure-idea-generator`)
**Created**: 2026-07-28  
**Status**: Implemented
**Input**: GitHub Issue [#1879](https://github.com/eserlan/Codex-Cryptica/issues/1879)

## Overview

The **Adventure Idea Generator** produces campaign-ready adventure concepts across 15 Codex Cryptica themes.

It mirrors the product boundary established by the Dungeon / Delve generator: the generator owns the **adventure concept and dramatic ingredients**, while the Adventure Builder / Spatial Canvas owns the playable graph structure.

The generator answers:

> **What is this adventure about, who is involved, what is happening, and why should the players care?**

It does **not** generate a fixed scene-by-scene plot or railroaded sequence. Output describes a **situation with multiple avenues of action**.

## Key Generator Fields & Architecture

- **Title**: Evocative adventure name (derived from narrative premise, avoiding cliché names like Vance).
- **Premise / Summary**: Concise 1-2 sentence description (stored in note `content`).
- **Initial Situation**: What is happening right now, before the players arrive.
- **Primary Objective & Pressure**: Main objective combined with primary + secondary pressure sources (Deadline/Countdown, Rival Race, Dwindling Resource, Active Pursuit, Evidence Decay, Escalating Crisis, Institutional Crackdown, Fragile Relationship, Opportunity Window, Accumulating Consequences).
- **Key Locations**: 2-4 places central to the scenario formatted with the **4-Point Filter** (Role, Relation, Leverage, Dilemma).
- **Important NPCs & Factions**: Who is involved, formatted with 4-point details (Relation, Wants, Secret, Leverage, Dilemma).
- **Threats / Antagonists**: Who or what opposes the players with bold evocative titles (`- **Title**: Description`).
- **Clues, Secrets & Discoveries**: Actionable revelations with bold titles.
- **Complications / Escalating Pressures**: Events that raise the stakes with bold titles.
- **Rewards / Stakes**: What is on the line and what players gain with bold titles.
- **Possible Outcomes**: Distinct world end-states with bold titles.
- **Adventure Hooks**: Why players engage with bold titles.

## Implemented Features Across Branch

1. **15 Genre Support Files**: Created dedicated genre tables in `packages/generator-engine/src/adventure/genres/` (Fantasy, Dark Fantasy, Sci-Fi, Cyberpunk, Post-Apoc, Gothic Horror, Western, Lancer, Steampunk, Vampire, Space Opera, Modern Conspiracy, Optimistic Sci-Fi, Pirate, etc.).
2. **Genre-Specific Loading Messages & Lingering Timer**: Added `packages/generator-engine/src/loading-messages.ts` with theme-aware loading messages and linger timing tuning.
3. **Cliché Name Ban System**: Filtered cliché names like Vance, Vance Vance, Elara, Kaelen, Lyra, etc. across NPC and Adventure generator prompts and validation checks (`public-npc-constants.ts`, `public-adventure.ts`).
4. **Primary & Secondary Pressure System**: Integrated multi-source dynamic pressure options in prompt builder and local generation.
5. **Vault Entity Category Mapping (`note` category)**: Mapped `adventure` generator to `"note"` vault category (`kind: "adventure"`).
6. **3-Column Preview UI Layout**: Updated `SEOGeneratorLayout.svelte` and `generator-document-layout.ts` to render 3 columns (Center column = Narrative Prose, Right column = DM Reference Rail).
7. **Full 10-Section GM Lore Preservation**: Structured Vault Note output to store player summary in `content` and all 10 GM sections in `lore`.
8. **Evocative Bold Titles for List Items**: Enforced `- **Title**: Description` format for Clues, Threats, Complications, Rewards, Outcomes, and Hooks instead of generic numbered headers (`Clue #1`). Fixed double-dash formatting (`- - `).
9. **Multi-Asset Classification & Preservation Dilemmas**: When an adventure revolves around transporting, protecting, or recovering multiple assets (cargo, pack animals, assay maps, mercury crates, hostages, relics, VIPs, or supply caches), the system explicitly classifies assets into **Essential** (mission critical), **Expendable** (can be traded/sacrificed), **Optional** (bonus payout), or **Secretly Critical** (holds far greater hidden importance than first appears). Key dilemmas and outcomes are built around what is preserved, traded, or sacrificed.
10. **Automatic Spatial Canvas Creation**: Generating or saving an adventure concept automatically initializes and links an Adventure Canvas spatial graph document.

## Acceptance Criteria

- Uses `WorldThemeId` / campaign theme dynamically across 15 themes.
- Inputs remain compact (adventure type/archetype, scale, tone, seed).
- Output contains premise, objective/pressure, locations, actors, threats, clues/secrets, complications, stakes/rewards, hooks, and possible outcomes.
- Generated adventures are situations rather than mandatory linear plots.
- Mapped to `"note"` vault category (adventures are notes with `kind: "adventure"`).
- Vault Adventure Notes preserve player summary in `content` and **ALL 10 GM Sections** in `lore`.
- Clues, threats, complications, rewards, outcomes, and hooks are generated with bold, evocative titles (`- **Title**: Description`).
- Preview card UI utilizes a 3-column layout (Center column = Narrative Prose, Right column = DM Reference Rail).
- Generator engine follows the dungeon pattern: mechanical/structural constraints deterministic, AI authors thematic content.
- Result can be saved as an Adventure Note entity/document in CC.
- Generated/saved adventures automatically create and link an Adventure Canvas spatial document.
- Relevant tests and generator metadata/help content added.
- Full Vitest suite passing with 100% generator coverage.
