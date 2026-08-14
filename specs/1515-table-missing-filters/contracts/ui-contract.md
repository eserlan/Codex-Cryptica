# UI Contract: Missing-Data Visibility & Column-Level Filters

**Feature**: `1515-table-missing-filters`  
**Date**: 2026-08-14

## UI Affordances & Routes

| Route    | Element                                    | Behavior                                                                                                                                           |
| -------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/table` | Incomplete Toggle (`[aria-pressed="..."]`) | Toggles `showIncompleteOnly`. When active, filters table to entities where `isIncomplete === true`. Displays count badge of incomplete items.      |
| `/table` | "Clear all filters" Button                 | Appears when `showIncompleteOnly === true`, or any column filter is non-default, or search query is non-empty. Resets all filters back to default. |
| `/table` | Column Header Filter Controls              | Allows selecting per-column filter criteria (e.g. Connections = "0 connections", Summary = "Missing summary", Labels = "No labels").               |
| `/table` | Column Active Filter Indicator             | Renders a small highlight/badge icon on the column header when that column has an active filter constraint.                                        |
| `/table` | Empty Table Cells in Incomplete Mode       | In `EntityTableRow.svelte`, empty cells (`—`) have heightened visibility when `showIncompleteOnly` is active.                                      |

## Accessibility & Keyboard Shortcuts

- Filter toggles MUST use proper `aria-pressed` or `aria-expanded` attributes.
- Column header menus MUST be keyboard navigable via `Tab` / `Enter` / `Escape`.
- Result counts MUST update screen-reader-accessible text.
