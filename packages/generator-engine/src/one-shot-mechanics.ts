/**
 * Checks that the rules of the adventure agree with each other: one count
 * for the countdown, and stated rules for a place that does not work like an
 * ordinary one. Prose often says "three rings open the gate" while the clock
 * has eight ticks; when the clock says what it counts, the numbers can be
 * compared.
 */

import type { OneShotAdventure, OneShotGap } from "./one-shot-types";

type GapCheck = (adventure: OneShotAdventure) => OneShotGap[];

const CARDINALS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const ORDINALS = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];

/** "bell rings" → "ring", "seals" → "seal". */
function countedNoun(counts: string): string {
  const last = counts.trim().toLowerCase().split(/\s+/).at(-1) ?? "";
  return last.replace(/(?:es|s)$/, "") || last;
}

const numberOf = (word: string) => {
  const w = word.toLowerCase();
  if (/^\d+$/.test(w)) return Number(w);
  const c = CARDINALS.indexOf(w);
  return c >= 0 ? c : ORDINALS.indexOf(w);
};

function mentions(
  text: string,
  noun: string,
  words: string[],
): { word: string; n: number }[] {
  const re = new RegExp(
    `\\b(${words.join("|")}|\\d+(?:st|nd|rd|th)?)\\s+(?:[a-z-]+\\s+)?${noun}(?:e?s)?\\b`,
    "gi",
  );
  return [...text.matchAll(re)].map((m) => {
    const word = m[1];
    const ordinal = /^\d+(?:st|nd|rd|th)$/i.exec(word);
    return {
      word,
      n: ordinal ? Number(word.replace(/\D/g, "")) : numberOf(word),
    };
  });
}

/** A counted clock: the numbers in the story match its ticks. */
export const checkClockCount: GapCheck = ({ clock, briefing, solution }) => {
  if (!clock?.counts) return [];
  const noun = countedNoun(clock.counts);
  if (!noun) return [];
  const ticks = clock.ticks.length;
  // Totals ("three rings open the gate") belong to what decides the end.
  const decisive = [
    briefing.secret,
    clock.deadline ?? "",
    solution?.summary ?? "",
  ].join(" ");
  const everywhere = [
    decisive,
    ...clock.ticks.map((t) => `${t.trigger} ${t.effect}`),
    ...(solution?.steps ?? []),
  ].join(" ");
  const wrongTotals = mentions(decisive, noun, CARDINALS.slice(2)).filter(
    (m) => m.n !== ticks,
  );
  const pastEnd = mentions(everywhere, noun, ORDINALS.slice(1)).filter(
    (m) => m.n > ticks,
  );
  const found = [...new Set([...wrongTotals, ...pastEnd].map((m) => m.n))];
  return found.length
    ? [
        {
          area: "clock",
          message: `The story counts ${clock.counts} as ${found.join(" and ")}, but the clock has ${ticks} ticks. Use one count: each ${noun} is a tick, and the last tick is the deadline.`,
        },
      ]
    : [];
};

const UNUSUAL_PLACE =
  /\b(?:underwater|under the (?:sea|water|waves)|beneath the (?:sea|water|waves|lake)|submerged|airless|vacuum|zero[- ]g|in orbit|lava|molten|frozen solid|inside (?:a|the) (?:dream|painting|mirror))\b/i;

/** A place that doesn't work normally needs its rules stated. */
export const checkEnvironment: GapCheck = (adventure) => {
  if (adventure.briefing.environment?.trim()) return [];
  const text = [
    adventure.briefing.premise,
    ...adventure.scenes.map((s) => `${s.location} ${s.situation}`),
  ].join(" ");
  const match = UNUSUAL_PLACE.exec(text);
  return match
    ? [
        {
          area: "briefing",
          message: `The adventure goes somewhere ${match[0].toLowerCase()}. Say how the place works: air, light, movement and speech.`,
        },
      ]
    : [];
};
