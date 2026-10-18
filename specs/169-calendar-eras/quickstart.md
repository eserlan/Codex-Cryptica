# Quickstart: Multiple Calendar Eras

**Feature Branch**: `169-calendar-eras`  
**Date**: 2026-10-03

## 1. Overview

This feature allows worldbuilders to define multiple named eras for their custom calendars (e.g. _Second Age_, _Third Age_, or _312 Before the Fall_ → _1 After the Fall_). Displayed year numbering can reset per era and count either forward or backward, while the underlying chronology engine keeps a continuous numeric year for timeline sorting and calendar math.

## 2. Configuration Example

### Setting up a Two-Epoch Calendar (BF / AF)

In Vault Settings > Chronology & Calendar:

1. Under **Calendar Eras**, click **Add Era**.
2. **Era 1 (Before the Fall)**:
   - Name: `Before the Fall`
   - Label: `BF`
   - Start Year: `-1`
   - Starting Displayed Year: `1`
   - Direction: `Backward`
3. **Era 2 (After the Fall)**:
   - Name: `After the Fall`
   - Label: `AF`
   - Start Year: `0`
   - Starting Displayed Year: `1`
   - Direction: `Forward`

### Chronology Mapping

- Internal year `-311` -> Displays as `312 BF`
- Internal year `-1` -> Displays as `1 BF`
- Internal year `0` -> Displays as `1 AF`
- Internal year `100` -> Displays as `101 AF`

## 3. Entering Dates

- In the Date Picker direct input:
  - Type `312 BF` or `15/04/312 BF`.
  - The picker converts it to internal year `-311` and sets April 15.
- In the Date Picker wheel:
  - Select the active era from the Era selector, and spin the year wheel within that era's numbering.

## 4. Developer API

```ts
import { calendarEngine } from "chronology-engine";

const formatted = calendarEngine.format({ year: -311 }, calendarConfig);
// => "312 BF"
```
