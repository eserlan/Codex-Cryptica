// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import DevelopmentResult from "./DevelopmentResult.svelte";
import type { Development } from "generator-engine";

afterEach(cleanup);

const base: Development = {
  mode: "develop",
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    { name: "Mara", role: "Smith", wants: "Scales", conflictsWith: "Warden" },
    { name: "Mara", role: "Guard", wants: "Peace", conflictsWith: "Smith" },
  ],
  playerDirections: [
    { title: "Follow it", description: "Trace it." },
    { title: "Search it", description: "Find it." },
  ],
  consequences: "The town runs dry.",
  creatorQuestions: ["Who built it?", "Who built it?"],
  generatorSuggestions: [],
};

describe("DevelopmentResult with repeated model output", () => {
  it("shows two people who share a name instead of crashing", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town." },
    });
    expect(screen.getAllByText(/Mara/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Smith/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guard/).length).toBeGreaterThan(0);
  });

  it("shows two identical creator questions instead of crashing", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town." },
    });
    expect(screen.getAllByText("Who built it?")).toHaveLength(2);
  });
});

describe("DevelopmentResult marks what changed", () => {
  const next = { ...base, whatChanged: "Looked at it as an assessment." };

  it("shows no badges and no summary for a first result", () => {
    render(DevelopmentResult, {
      props: { development: base, ideaText: "A town.", changed: null },
    });
    expect(screen.queryByText("Updated")).toBeNull();
    expect(screen.queryByText(/sections updated/i)).toBeNull();
  });

  it("badges each section that changed and lists them at the top", () => {
    render(DevelopmentResult, {
      props: {
        development: next,
        ideaText: "A town.",
        changed: ["centralQuestion", "consequences"],
      },
    });
    expect(screen.getAllByText("Updated")).toHaveLength(2);
    expect(
      screen.getByText(
        /sections updated: central question, if nobody steps in/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/looked at it as an assessment/i)).toBeTruthy();
  });

  it("says plainly when nothing changed", () => {
    render(DevelopmentResult, {
      props: { development: next, ideaText: "A town.", changed: [] },
    });
    expect(screen.queryByText("Updated")).toBeNull();
    expect(screen.getByText(/no sections changed/i)).toBeTruthy();
  });

  it("shows the mode and which turn this is", () => {
    render(DevelopmentResult, {
      props: {
        development: { ...next, mode: "assess" },
        ideaText: "A town.",
        changed: [],
        turn: 2,
      },
    });
    expect(screen.getByTestId("mode-label").textContent).toMatch(
      /^assess mode\s*·\s*turn 2$/i,
    );
  });
});

describe("DevelopmentResult shows the previous version on request", () => {
  const before: Development = {
    mode: "develop",
    alreadyInteresting: "Everything is made from dragon parts.",
    centralQuestion: "Where do the parts come from?",
    makeItMove: "The last shipment is late.",
    peopleWhoCare: [
      {
        name: "Mara",
        role: "Smith",
        wants: "More scales",
        conflictsWith: "Warden",
      },
      { name: "Warden", role: "Guard", wants: "Peace", conflictsWith: "Mara" },
    ],
    playerDirections: [
      { title: "Follow it", description: "Trace it." },
      { title: "Search it", description: "Find it." },
    ],
    consequences: "The town runs dry.",
    creatorQuestions: ["Who built it?", "Why now?"],
    generatorSuggestions: [],
  };
  const after: Development = {
    ...before,
    whatChanged: "Looked at it as an assessment.",
    centralQuestion: "Who is quietly buying the parts?",
    peopleWhoCare: [
      {
        name: "Mara",
        role: "Smith",
        wants: "A fair price",
        conflictsWith: "Warden",
      },
      before.peopleWhoCare[1],
    ],
    creatorQuestions: ["Who built it?", "Who pays the smiths?"],
  };
  const changed = [
    "centralQuestion",
    "peopleWhoCare",
    "creatorQuestions",
  ] as const;

  function show() {
    render(DevelopmentResult, {
      props: {
        development: after,
        previous: before,
        ideaText: "A town.",
        changed: [...changed],
      },
    });
  }
  const updatedButtons = () =>
    screen.getAllByRole("button", { name: /updated/i });

  it("turns each Updated marker into a button, only on sections that changed", () => {
    show();
    expect(updatedButtons()).toHaveLength(3);
  });

  it("keeps the previous version hidden until asked", () => {
    show();
    for (const button of updatedButtons()) {
      expect(button.getAttribute("aria-expanded")).toBe("false");
    }
    expect(screen.queryByText("Where do the parts come from?")).toBeNull();
    expect(screen.queryByText(/before this turn/i)).toBeNull();
  });

  it("shows the previous text beside the new text, and hides it again", async () => {
    show();
    const [central] = updatedButtons();
    await fireEvent.click(central);
    expect(central.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Where do the parts come from?")).toBeTruthy();
    expect(screen.getByText(/before this turn/i)).toBeTruthy();
    // the current version is still on screen
    expect(screen.getByText("Who is quietly buying the parts?")).toBeTruthy();
    await fireEvent.click(central);
    expect(central.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Where do the parts come from?")).toBeNull();
  });

  it("ties the button to the panel it opens", async () => {
    show();
    const [central] = updatedButtons();
    await fireEvent.click(central);
    const id = central.getAttribute("aria-controls")!;
    expect(document.getElementById(id)).toBeTruthy();
    expect(document.getElementById(id)!.textContent).toContain(
      "Where do the parts come from?",
    );
  });

  it("shows the previous people and questions the same way they are shown now", async () => {
    show();
    const buttons = updatedButtons();
    await fireEvent.click(buttons[1]);
    expect(screen.getByText(/More scales/)).toBeTruthy();
    await fireEvent.click(buttons[2]);
    expect(screen.getByText("Why now?")).toBeTruthy();
  });

  it("opens each section on its own", async () => {
    show();
    await fireEvent.click(updatedButtons()[0]);
    const others = updatedButtons().slice(1);
    for (const button of others)
      expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Why now?")).toBeNull();
  });

  it("closes everything when a new result arrives", async () => {
    const view = render(DevelopmentResult, {
      props: {
        development: after,
        previous: before,
        ideaText: "A town.",
        changed: [...changed],
      },
    });
    await fireEvent.click(updatedButtons()[0]);
    expect(screen.getByText("Where do the parts come from?")).toBeTruthy();
    const next = {
      ...after,
      centralQuestion: "What do the smiths owe the Warden?",
    };
    await view.rerender({
      development: next,
      previous: after,
      ideaText: "A town.",
      changed: ["centralQuestion"],
    });
    for (const button of updatedButtons()) {
      expect(button.getAttribute("aria-expanded")).toBe("false");
    }
    expect(screen.queryByText("Who is quietly buying the parts?")).toBeNull();
  });

  it("still marks a change, without a button, if there is no earlier version to show", () => {
    render(DevelopmentResult, {
      props: {
        development: after,
        ideaText: "A town.",
        changed: ["centralQuestion"],
      },
    });
    expect(screen.getByText("Updated")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /updated/i })).toBeNull();
  });
});
