# UI Mockups: Scroll Wheel Date Picker

## Issue Sketch References

Source issue: <https://github.com/eserlan/Codex-Cryptica/issues/873>

The issue includes two visual references for the desired picker direction:

![Current date picker screenshot](https://github.com/user-attachments/assets/0c1ec38a-a800-4b40-b887-9efa5ed31d7e)

![Dynamic scroll wheel sketch](https://github.com/user-attachments/assets/8da33b13-f935-43b9-afbf-a909141e673d)

Use these as inspiration for a compact popover with side-by-side vertical wheels, a centered selection lens, faded off-center values, and a synchronized preview.

## 1. Default Numeric Wheel

```text
+------------------------------------------------+
| Date                                           |
| Full date                                      |
|                                                |
|        Year          Month           Day       |
|      1241            02             11         |
|      1242            03             12         |
|   +----------------------------------------+   |
|   |  1243            04             13     |   |
|   +----------------------------------------+   |
|      1244            05             14         |
|      1245            06             15         |
|                                                |
|  13 Month 4 1243 AF                           |
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- The centered lens defines the selected values.
- Mouse wheel, touch drag, and keyboard stepper/listbox actions all update the same selected value.
- Large numeric ranges expose direct entry or jump controls without replacing the wheel.

## 2. Named Unit Shift

```text
+------------------------------------------------+
| Date                                           |
| Year + unit                                   |
|                                                |
|        Year          Season                    |
|      409             Deep Winter               |
|      410             First Thaw                |
|   +----------------------------------------+   |
|   |  411             Dragonrise             |  |
|   +----------------------------------------+   |
|      412             Harvestfall              |
|      413             Long Night               |
|                                                |
|  Dragonrise 411 AF                            |
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- Named unit columns can widen relative to numeric columns.
- Saved selections use stable option identities, not visible labels or current array position.
- Renames and reordering must not change what existing saved dates point to.

## 3. Long Label On Mobile

```text
+----------------------------------+
| Date                             |
| Full date                        |
|                                  |
|   Year      Month          Day   |
|   1242      The Month...   18    |
| +----------------------------+   |
| | 1243      The Awak...   19 |   |
| +----------------------------+   |
|   1244      The Long...   20     |
|                                  |
|  19 The Awakening Dragon 1243 AF |
|                                  |
| [Cancel]              [Apply]    |
+----------------------------------+
```

Implementation notes:

- Wheel labels truncate with ellipsis inside their track.
- The preview always shows the full untruncated representation.
- Text must not overlap adjacent wheel columns at 320px viewport width.

## 4. Intercalary Anchor Precision

```text
+------------------------------------------------+
| Date                                           |
| Anchor                                         |
|                                                |
|        Year          Anchor                    |
|      1241            Midwinter                 |
|      1242            Greengrass                |
|   +----------------------------------------+   |
|   |  1243            Midsummer              |  |
|   +----------------------------------------+   |
|      1244            Highharvestide           |
|      1245            Feast of the Moon        |
|                                                |
|  Midsummer 1243 AF                            |
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- Anchor precision replaces normal month/day selection.
- Anchors save as named date anchors and must not fabricate month/day values.
- Anchor labels follow the same truncation and full-preview behavior as other named values.

## 5. Overflow Cap After Parent Change

```text
+------------------------------------------------+
| Date                                           |
| Full date                                      |
|                                                |
|        Year          Month           Day       |
|      1242            Month 3        33         |
|   +----------------------------------------+   |
|   |  1243            Month 4        30     |   |
|   +----------------------------------------+   |
|      1244            Month 5        31         |
|                                                |
|  Day changed from 34 to 30 because Month 4     |
|  has only 30 days.                             |
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- Parent changes evaluate top down.
- When a child value overflows, cap to the new maximum and show concise feedback before save.
- If the original saved value is invalid because of a calendar edit, use repair state instead of silent capping.

## 6. Invalid Direct Entry

```text
+------------------------------------------------+
| Date                                           |
| Full date                                      |
|                                                |
|  Direct date                                  |
|  +------------------------------------------+  |
|  | 30/02/1243                               |  |
|  +------------------------------------------+  |
|  Enter a valid day for February.               |
|                                                |
|  Last valid date remains selected:             |
|  28 February 1243 AF                           |
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- Invalid direct numeric entries do not mutate the selected date.
- Inline feedback uses plain language and is announced to assistive technology.
- Apply remains blocked while the direct entry is invalid.

## 7. Repair State

```text
+------------------------------------------------+
| Date needs review                              |
|                                                |
|  This date used an older calendar version.     |
|                                                |
|  Original                                      |
|  34 Month 3 1243 AF                            |
|                                                |
|  Suggested                                    |
|  30 Month 4 1243 AF                            |
|                                                |
|  [Keep original]        [Use suggested date]   |
+------------------------------------------------+
```

Implementation notes:

- Preserve the original saved value until the user confirms replacement.
- Show why repair is needed when possible: missing unit, missing anchor, day overflow, or stale revision.
- Do not save a date computed from mixed calendar rules if the calendar changes while the picker is open.

## 8. Keyboard/Listbox Focus State

```text
+------------------------------------------------+
| Date                                           |
| Full date                                      |
|                                                |
|        Year          Month           Day       |
|      1242            03             12         |
|   +----------------------------------------+   |
|   | [1243]          Month 4        13      |   |
|   +----------------------------------------+   |
|      1244            05             14         |
|                                                |
|  Year, selected 1243. Use arrow keys to change.|
|                                                |
|  [Cancel]                         [Apply]      |
+------------------------------------------------+
```

Implementation notes:

- Each wheel column exposes keyboard-operable stepper or listbox behavior.
- Current value announcements include the column label and selected value.
- Focus styling must be visible without shifting the wheel layout.
