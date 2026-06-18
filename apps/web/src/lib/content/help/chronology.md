---
id: chronology
title: Custom Chronology
description: Browse campaign history with calendar, agenda, and timeline views plus custom date controls.
icon: icon-[lucide--history]
rank: 11
tags: ["time", "timeline", "calendar", "eras"]
---

# Custom Chronology

Codex Cryptica lets you shape time for your campaign world and then browse it in a way that fits the moment. Use the month calendar for day-by-day history, switch to the agenda view for a clean running list, or keep the classic timeline when you want a broader sweep.

## The Date Picker

When editing an entity's temporal data (Date, Start Date, or End Date), you will use the dynamic **Scroll-Wheel Date Picker**.

### Center-Aligned Scroll Wheels

The date picker uses a smooth, vertical, center-aligned scroll wheel interface designed for both desktop mouse-wheel and mobile touch interactions:

1. **Center Snapping**: Wheels automatically snap center-aligned options into place. A highlight lens guides your visual focus.
2. **Synchronized Preview**: Below the wheels, a live, full-text preview renders the exact formatted date so you are always clear on your selection, even when dealing with truncated long names.
3. **Direct Jump Override**: Need to select a year far in the past or future? Simply click the keyboard icon in any column to directly type a numeric override.

### Precision Levels & Intercalary Anchors

The picker allows you to choose your granularity using the toggle at the top:

- **Year**: For broad historical events.
- **Month/Unit**: For seasonal occurrences.
- **Day**: For specific, high-precision moments.
- **Anchor**: For special intercalary days (e.g., Midyear festivals) that sit outside standard months.

### Conflict Auto-Repair

If you change your campaign calendar structure after saving dates, opening the picker automatically triggers an **inline repair warning**. You can view the discrepancy and click **Confirm Repair** to cleanly align the date to the new calendar constraints without silent, accidental data loss.

## Campaign Calendars

In the **Vault Settings**, you can fully customize your world's calendar:

1. **Standard Gregorian**: Keep this enabled to use the standard 12-month calendar.
2. **Custom Months**: Disable Gregorian mode to define your own months. You can rename them (e.g., "Hammer", "Alturiak") and set custom lengths.
3. **Epoch Suffixes**: Add suffixes like "AF" (After Fall) or "BCE" to your years for immersion.
4. **Present Year**: Set a "Present" marker to anchor your narrative timeline.

## Linear Time Mapping

Regardless of how many months or days you define, the Knowledge Graph automatically calculates a linear value for each date. This ensures that even the most complex custom calendars are visualized correctly across the **World Timeline**, **Calendar**, and **Agenda** views.

## Calendar And Agenda Views

Open the chronology route to switch between four ways of browsing history:

- **Calendar** shows exact-dated events in a month grid.
- **Agenda** groups events in chronological order and keeps `Undated/Approximate` entries visible.
- **Timeline** and **Bands** keep the earlier vertical and horizontal chronology layouts available.

The calendar and agenda views support the same core filters:

- **Type** narrows entries by entity type.
- **Label** narrows entries by metadata labels.
- **Related** narrows entries by linked factions, characters, regions, or other connected entities.

When multiple filters are active, an event must match all of them to remain visible.

## Handling Approximate Dates

Approximate or incomplete dates are intentionally kept out of exact day cells in the month grid. You can still find them in the **Agenda** view under **Undated/Approximate**.
