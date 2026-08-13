# Feature Specification: Dungeon / Delve Idea Generator

**Feature Branch**: `1825-dungeon-idea-generator`  
**Created**: 2026-07-25  
**Status**: Completed  
**Input**: User description: "gh issue has been updated , adapt code accordingly"  
**GitHub Issue**: [#1825](https://github.com/eserlan/Codex-Cryptica/issues/1825)

## Overview

The **Dungeon / Delve Idea Generator** produces multi-layered, thematic, and campaign-ready dungeons, ancient ruins, subterranean complexes, alien vaults, or cybernetic facilities.

It consumes Codex Cryptica's existing selected theme source (`THEMES` / `WorldThemeId`) rather than maintaining a separate hardcoded genre dropdown. Adding new themes to Codex Cryptica automatically influences the dungeon generator's terminology, atmosphere, hazards, signature features, conflicts, inhabitants, and rewards.

## Key Generator Fields

- **Name / Title**: Evocative location name
- **Premise / Summary**: Concise 1-2 sentence description of why the location is interesting
- **History & Original Purpose**: Original purpose and the transformation event
- **Current State & Function**: Current operational condition and how it functions today
- **Signature Feature**: Memorable landmark or phenomenon defining the location
- **Current Conflict**: Active tension unfolding before PCs arrive
- **Key Sectors / Layout**: 3-5 distinct sectors, wings, or levels
- **Inhabitants & Factions**: Dominant inhabitants, rivals, guardians, and their internal dynamic
- **Hazards & Traps**: Environmental, structural, trap, or security dangers
- **Central Secret**: Hidden truth, mystery, or boss complication
- **Treasures & Relics**: Loot, technology, relics, or knowledge
- **Adventure Hooks & Rumours**: 2-3 reasons to enter and imperfect information circulating

## Acceptance Criteria

- Uses `WorldThemeId` / campaign theme dynamically without extra hardcoded genre select options.
- Compact controls provided for Purpose, Current State, and Scale.
- Structured output contains signature feature, current conflict, sectors, inhabitants, hazards, secret, loot, and hooks.
- Mapped to `"location"` vault category.
- Full Vitest suite passing with 100% generator coverage.
