/**
 * Emphasises table-facing cues in point crawl prose (#4614): ability checks
 * such as `DC 13 Intelligence (Investigation)` and clock triggers such as
 * `At hour 12:` are wrapped in Markdown bold so a GM can spot them at a glance.
 */

const ABILITY_NAMES =
  "Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";

// Existing bold and inline code spans are matched first and kept verbatim.
// A cue directly after `**` is left alone so a second pass never re-wraps it.
const CUE_PATTERN = new RegExp(
  [
    "(\\*\\*[\\s\\S]*?\\*\\*|`[^`]*`)",
    `(?<!\\*\\*)(\\bDC\\s+\\d+\\b(?:\\s+(?:${ABILITY_NAMES})\\b(?:\\s+\\([A-Za-z ]+\\))?)?|\\bAt\\s+(?:hour|minute|day)\\s+\\d+:)`,
  ].join("|"),
  "g",
);

export function emphasisePointCrawlCues(text: string): string {
  return text.replace(CUE_PATTERN, (match, kept: string | undefined) =>
    kept === undefined ? `**${match}**` : match,
  );
}
