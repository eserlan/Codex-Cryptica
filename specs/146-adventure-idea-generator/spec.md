# Feature Specification: Adventure Idea Generator

**Feature Branch**: `146-adventure-idea-generator`  
**Created**: 2026-07-28  
**Status**: In Progress  
**Input**: GitHub Issue [#1879](https://github.com/eserlan/Codex-Cryptica/issues/1879)

## Overview

The **Adventure Idea Generator** produces campaign-ready adventure concepts across Codex Cryptica themes.

It mirrors the product boundary established by the Dungeon / Delve generator: the generator owns the **adventure concept and dramatic ingredients**, while a later Adventure Builder owns the playable graph/structure.

The generator answers:

> **What is this adventure about, who is involved, what is happening, and why should the players care?**

It does **not** generate a fixed scene-by-scene plot or railroaded sequence. Output describes a **situation with multiple avenues of action**.

## Key Generator Fields

- **Title**: Evocative adventure name
- **Premise / Summary**: Concise 1-2 sentence description
- **Initial Situation**: What is happening right now, before the players arrive
- **Primary Objective / Pressure**: The main thing driving the scenario
- **Key Locations**: 2-4 places central to the scenario
- **Important NPCs & Factions**: Who is involved and what they want
- **Threats / Antagonists**: Who or what opposes the players
- **Clues, Secrets & Discoveries**: Hidden truths to uncover
- **Complications / Escalating Pressures**: Events that raise the stakes
- **Rewards / Stakes**: What is on the line and what players can gain
- **Possible Outcomes**: Several non-linear resolutions
- **Adventure Hooks**: Why players engage

## Acceptance Criteria

- Uses `WorldThemeId` / campaign theme dynamically without extra hardcoded genre select options.
- Inputs remain compact (adventure type/archetype, scale, tone, seed).
- Output contains premise, objective/pressure, locations, actors, threats, clues/secrets, complications, stakes/rewards, hooks, and possible outcomes.
- Generated adventures are situations rather than mandatory linear plots.
- Mapped to `"event"` vault category (adventures are events, not locations).
- Generator engine follows the dungeon pattern: mechanical/structural constraints deterministic, AI authors thematic content.
- Result can be saved as an Adventure entity/document in CC.
- Generated/saved adventures expose a **Build Adventure** action (as a follow-up suggestion) once the builder exists.
- Relevant tests and generator metadata/help content added.
- Full Vitest suite passing with 100% generator coverage.
