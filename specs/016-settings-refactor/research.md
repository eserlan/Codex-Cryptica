# Research: Settings UI Architecture

**Feature**: Settings Panel Refactoring (016-settings-refactor)

## Context

The current settings are nested under the "Cloud Sync" status. This creates a mental model where AI settings and Category management are "cloud" features, which is incorrect as they are local-first.

## UI Decisions

### 1. Modal vs. Sidebar

- **Decision**: Centered Modal.
- **Rationale**: Codex Cryptica is a dense, graph-heavy application. A modal provides a focused "workspace" for configuration without permanently sacrificing screen real-estate.

### 2. Tab Navigation

- **Decision**: Left Sidebar for Desktop, Bottom Bar or Top Icons for Mobile.
- **Rationale**: Left sidebar is standard for complex settings (VS Code, Discord). It scales better than top tabs as the number of configuration categories grows.

### 3. Component Reusability

- **Decision**: Refactor `CloudStatus` to be a "dumb" view when embedded.
- **Rationale**: `CloudStatus` currently contains both the status indicator (gear icon + ping) and the dropdown menu. We want to keep the indicator in the header but move the menu content into the Settings Modal.

## Competitive Analysis

- **Obsidian**: Large modal with left sidebar categorization.
- **Logseq**: Centered modal with clear sections.
- **VS Code**: Dedicated settings editor (too complex for current needs).
