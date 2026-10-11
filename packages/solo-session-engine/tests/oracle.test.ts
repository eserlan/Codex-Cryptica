import { describe, expect, it } from "bun:test";
import {
  LIKELIHOODS,
  answerFor,
  askOracle,
  clampTension,
  eventHappens,
  rollRandomEvent,
  type EventContext,
  type Likelihood,
} from "../src/oracle";
import { FOCI, ACTIONS } from "../src/event-tables";

const at = (roll: number) => () => (roll - 1 + 0.5) / 100;
const ctx: EventContext = {
  openThreads: [{ id: "t1", title: "Why is the keeper lying?" }],
  partyNames: ["Kael"],
  placeName: "Greyhollow",
};

describe("answerFor", () => {
  it("returns an answer from the scale for every likelihood and roll", () => {
    const scale = ["Yes, and", "Yes", "Yes, but", "No, but", "No", "No, and"];
    for (const l of LIKELIHOODS) {
      for (let roll = 1; roll <= 100; roll++)
        expect(scale).toContain(answerFor(l, roll));
    }
  });

  it("makes yes more likely as the likelihood rises", () => {
    const yes = (l: Likelihood) =>
      Array.from({ length: 100 }, (_, i) => i + 1).filter((r) =>
        answerFor(l, r).startsWith("Yes"),
      ).length;
    expect(yes("very_unlikely")).toBeLessThan(yes("unlikely"));
    expect(yes("unlikely")).toBeLessThan(yes("even"));
    expect(yes("even")).toBeLessThan(yes("likely"));
    expect(yes("likely")).toBeLessThan(yes("very_likely"));
  });
});

describe("askOracle", () => {
  it("returns an answer, the roll, and trims the question to 200 characters", () => {
    const result = askOracle(
      {
        question: `  ${"x".repeat(250)}  `,
        likelihood: "even",
        tension: 5,
        context: ctx,
      },
      at(50),
    );
    expect(result.question.length).toBe(200);
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(100);
  });

  it("allows an empty question", () => {
    const result = askOracle(
      { question: "", likelihood: "even", tension: 5, context: ctx },
      at(20),
    );
    expect(result.question).toBe("");
  });

  it("is deterministic for an injected random source", () => {
    const run = () =>
      askOracle(
        { question: "Q", likelihood: "likely", tension: 5, context: ctx },
        at(77),
      );
    expect(run()).toEqual(run());
  });

  it("does not change the answer with tension, only whether an event follows", () => {
    const low = askOracle(
      { question: "Q", likelihood: "even", tension: 1, context: ctx },
      at(30),
    );
    const high = askOracle(
      { question: "Q", likelihood: "even", tension: 9, context: ctx },
      at(30),
    );
    expect(high.answer).toBe(low.answer);
  });
});

describe("eventHappens", () => {
  it("holds at twice the tension and fails just above it, at both ends", () => {
    expect(eventHappens(2, 1)).toBe(true);
    expect(eventHappens(3, 1)).toBe(false);
    expect(eventHappens(18, 9)).toBe(true);
    expect(eventHappens(19, 9)).toBe(false);
  });

  it("makes events at least three times as frequent at tension 9 as at 1", () => {
    let low = 0;
    let high = 0;
    for (let r = 1; r <= 100; r++) {
      if (eventHappens(r, 1)) low++;
      if (eventHappens(r, 9)) high++;
    }
    expect(high).toBeGreaterThanOrEqual(low * 3);
  });
});

describe("clampTension", () => {
  it("keeps tension between 1 and 9 and treats non-finite values as the default", () => {
    expect(clampTension(0)).toBe(1);
    expect(clampTension(10)).toBe(9);
    expect(clampTension(Number.NaN)).toBe(5);
  });
});

describe("rollRandomEvent", () => {
  it("names a focus, an action and a subject in one sentence", () => {
    const event = rollRandomEvent(ctx, at(40));
    expect(FOCI.map((f) => f.id)).toContain(event.focus);
    expect(ACTIONS).toContain(event.action);
    expect(event.text.endsWith(".")).toBe(true);
    expect(event.text).toContain(event.subject.label);
  });

  it("never names a closed thread: a thread focus with no open threads falls back", () => {
    const threadFocus = FOCI.findIndex((f) => f.subject === "thread");
    const rng = () => (threadFocus + 0.5) / FOCI.length;
    const event = rollRandomEvent(
      { openThreads: [], partyNames: ["Kael"], placeName: null },
      rng,
    );
    expect(event.subject.kind).not.toBe("thread");
  });

  it("falls back from a party focus with no party, then from place to someone new", () => {
    const partyFocus = FOCI.findIndex((f) => f.subject === "party");
    const event = rollRandomEvent(
      { openThreads: [], partyNames: [], placeName: null },
      () => (partyFocus + 0.5) / FOCI.length,
    );
    expect(event.subject).toEqual({ kind: "newcomer", label: "someone new" });
  });

  it("points at one of the open threads when a thread focus is chosen", () => {
    const threadFocus = FOCI.findIndex((f) => f.subject === "thread");
    const event = rollRandomEvent(ctx, () => (threadFocus + 0.5) / FOCI.length);
    expect(event.subject).toEqual({
      kind: "thread",
      label: "Why is the keeper lying?",
      threadId: "t1",
    });
  });
});

describe("originality (FR-008)", () => {
  // Published systems whose names or table wording must not appear in our text.
  const PUBLISHED_TERMS = [
    "mythic",
    "chaos factor",
    "fate chart",
    "fate question",
    "meaning table",
    "random event focus",
    "ironsworn",
    "burning wheel",
    "ask the oracle",
  ];

  it("the event tables and answer scale use none of the published terms", () => {
    const answers = ["Yes, and", "Yes", "Yes, but", "No, but", "No", "No, and"];
    const text = [...FOCI.map((f) => f.label), ...ACTIONS, ...answers]
      .join("\n")
      .toLowerCase();
    const found = PUBLISHED_TERMS.filter((term) => text.includes(term));
    expect(found).toEqual([]);
  });
});
