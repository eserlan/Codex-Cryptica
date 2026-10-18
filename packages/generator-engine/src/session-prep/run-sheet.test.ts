import { describe, expect, it } from "vitest";
import {
  addRoutesToClue,
  applySuggestionOption,
  createEmptySessionPrep,
  type SessionPrep,
} from "./model";
import {
  describeSuggestionOption,
  toRunSheetMarkdown,
  toSessionPrepLore,
} from "./run-sheet";

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

function prep(): SessionPrep {
  const value = createEmptySessionPrep("A courier vanished on the road.");
  value.start = "A riderless horse walks\nthrough the gate.";
  value.pressure = "The judge arrives in two days.";
  value.people = [
    {
      id: "p1",
      name: "Reeve Callan",
      wants: "the ledger burned",
      doesNext: "sends men to the mill",
      source: "gm",
    },
  ];
  value.information = [
    {
      id: "c1",
      fact: "The courier is alive at the mill",
      routes: ["Tebb saw the cart", "mud at the ambush site"],
      critical: true,
      source: "gm",
    },
  ];
  value.consequences.delay = "The ledger is ash by morning.";
  return value;
}

describe("toRunSheetMarkdown", () => {
  it("renders the run-sheet sections in table order", () => {
    const markdown = toRunSheetMarkdown(prep());
    const headings = markdown.match(/^## .+$/gm);
    expect(headings).toEqual([
      "## Open",
      "## Pressure",
      "## People",
      "## Information",
      "## Consequences",
    ]);
    expect(markdown).toContain("A riderless horse walks through the gate.");
    expect(markdown).toContain(
      "- **Reeve Callan:** wants the ledger burned. Next: sends men to the mill.",
    );
    expect(markdown).toContain(
      "- **The courier is alive at the mill.** (needed) Found by: Tebb saw the cart; mud at the ambush site",
    );
    expect(markdown).toContain(
      "- **If they delay:** The ledger is ash by morning.",
    );
  });

  it("omits empty steps and blank list items instead of printing placeholders", () => {
    const value = createEmptySessionPrep("hook");
    value.pressure = "Something moves.";
    value.complications = [{ id: "x", text: "  ", source: "gm" }];
    expect(toRunSheetMarkdown(value)).toBe("## Pressure\nSomething moves.");
  });

  it("does not leave a dangling colon on a person with no details", () => {
    const value = createEmptySessionPrep("hook");
    value.people = [
      { id: "p", name: "Keeper Orla", wants: "", doesNext: "", source: "gm" },
    ];
    expect(toRunSheetMarkdown(value)).toBe("## People\n- **Keeper Orla**");
  });

  it("does not double up punctuation after a fact that ends a sentence", () => {
    const value = createEmptySessionPrep("hook");
    value.information = [
      {
        id: "a",
        fact: "Orla is hiding something.",
        routes: ["her records"],
        critical: false,
        source: "ai",
      },
      {
        id: "b",
        fact: "The theft was planned.",
        routes: ["the lock", "a witness"],
        critical: true,
        source: "ai",
      },
    ];
    const markdown = toRunSheetMarkdown(value);
    expect(markdown).toContain(
      "- **Orla is hiding something.** Found by: her records",
    );
    expect(markdown).toContain(
      "- **The theft was planned.** (needed) Found by: the lock; a witness",
    );
    expect(markdown).not.toMatch(/\.\.|\)\./);
  });

  it("bolds a leading label in notes so they stay ordinary list items", () => {
    const value = createEmptySessionPrep("hook");
    value.reserve = [
      {
        id: "r1",
        text: "The Bellfounder's Yard: noisy machinery",
        source: "ai",
      },
      { id: "r2", text: "A tinker with gossip", source: "gm" },
    ];
    expect(toRunSheetMarkdown(value)).toBe(
      "## Reserve\n- **The Bellfounder's Yard:** noisy machinery\n- A tinker with gossip",
    );
  });

  it("flags a needed fact that has only one route", () => {
    const value = prep();
    value.information[0].routes = ["Tebb saw the cart"];
    expect(toRunSheetMarkdown(value)).toContain(
      "(needed, only one route) Found by: Tebb saw the cart",
    );
  });
});

describe("describeSuggestionOption", () => {
  it("summarises structured options on one line", () => {
    expect(
      describeSuggestionOption(
        {
          step: "information",
          options: [
            {
              fact: "The courier is alive",
              routes: ["Tebb", "mud"],
              critical: true,
            },
          ],
        },
        0,
      ),
    ).toBe("The courier is alive (found by: Tebb; mud)");
    expect(
      describeSuggestionOption(
        {
          step: "consequences",
          options: [
            { success: "Exposed", failure: "", delay: "Ash", avoidance: "" },
          ],
        },
        0,
      ),
    ).toBe("If they succeed: Exposed / If they delay: Ash");
  });

  it("returns an empty string for a missing option", () => {
    expect(describeSuggestionOption({ step: "start", options: [] }, 0)).toBe(
      "",
    );
  });
});

describe("toSessionPrepLore", () => {
  it("keeps the GM's original hook visible", () => {
    expect(toSessionPrepLore(prep())).toContain(
      "### Your hook\n> A courier vanished on the road.",
    );
  });

  it("is empty when there is no hook", () => {
    expect(toSessionPrepLore(createEmptySessionPrep())).toBe("");
  });
});

describe("applySuggestionOption", () => {
  it("appends a suggested person as AI material", () => {
    const next = applySuggestionOption(
      prep(),
      {
        step: "people",
        options: [
          { name: "Maren", wants: "her brother back", doesNext: "goes alone" },
        ],
      },
      0,
      sequentialIds(),
    );
    expect(next.people).toHaveLength(2);
    expect(next.people[1]).toEqual({
      id: "id-1",
      name: "Maren",
      wants: "her brother back",
      doesNext: "goes alone",
      source: "ai",
    });
  });

  it("replaces a text step only because the GM picked that option", () => {
    const next = applySuggestionOption(
      prep(),
      { step: "pressure", options: ["Callan's men reach the mill first."] },
      0,
      sequentialIds(),
    );
    expect(next.pressure).toBe("Callan's men reach the mill first.");
  });

  it("fills only blank consequences", () => {
    const next = applySuggestionOption(
      prep(),
      {
        step: "consequences",
        options: [
          {
            success: "Callan is exposed.",
            failure: "",
            delay: "AI delay",
            avoidance: "",
          },
        ],
      },
      0,
      sequentialIds(),
    );
    expect(next.consequences.success).toBe("Callan is exposed.");
    expect(next.consequences.delay).toBe("The ledger is ash by morning.");
  });

  it("ignores an option index that does not exist", () => {
    const original = prep();
    expect(
      applySuggestionOption(
        original,
        { step: "pressure", options: ["x"] },
        3,
        sequentialIds(),
      ),
    ).toEqual(original);
  });
});

describe("addRoutesToClue", () => {
  it("adds new routes, skipping duplicates and blanks", () => {
    const next = addRoutesToClue(prep(), "c1", [
      "Tebb saw the cart",
      "  ",
      "Dosh admits it",
    ]);
    expect(next.information[0].routes).toEqual([
      "Tebb saw the cart",
      "mud at the ambush site",
      "Dosh admits it",
    ]);
  });

  it("leaves the prep unchanged for an unknown clue", () => {
    const original = prep();
    expect(addRoutesToClue(original, "missing", ["x"])).toEqual(original);
  });
});
