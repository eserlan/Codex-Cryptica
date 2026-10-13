import { describe, it, expect } from "vitest";
import { resolveFocusQuery } from "./conversation-focus";

const elara = {
  id: "elara",
  title: "Elara Voss",
  categoryId: "character",
  aliases: ["Grand Archmage"],
};
const elira = { id: "elira", title: "Elira Zöldmező", categoryId: "character" };
const ashford = { id: "ashford", title: "Ashford", categoryId: "location" };
const wardens = { id: "wardens", title: "Iron Wardens", categoryId: "faction" };
const blade = { id: "blade", title: "Sunblade", categoryId: "item" };
const all = [elara, elira, ashford, wardens, blade];

describe("resolveFocusQuery", () => {
  it("ties a pronoun follow-up to the focus record", () => {
    expect(
      resolveFocusQuery("Give me a four facts about her", elara, all),
    ).toBe("Give me a four facts about her (about Elara Voss)");
    expect(resolveFocusQuery("Who are her allies?", elara, all)).toBe(
      "Who are her allies? (about Elara Voss)",
    );
  });

  it("handles places, factions and items", () => {
    expect(resolveFocusQuery("Who rules that city?", ashford, all)).toContain(
      "(about Ashford)",
    );
    expect(resolveFocusQuery("Where is it?", blade, all)).toContain(
      "(about Sunblade)",
    );
    expect(resolveFocusQuery("Who are their enemies?", wardens, all)).toContain(
      "(about Iron Wardens)",
    );
  });

  it("returns null when the query has no anaphora", () => {
    expect(resolveFocusQuery("List the factions", elara, all)).toBeNull();
  });

  it("returns null when the user names a different record", () => {
    expect(
      resolveFocusQuery(
        "Where was Elira Zöldmező born? Is she old?",
        elara,
        all,
      ),
    ).toBeNull();
  });

  it("matches other records by whole word only", () => {
    const war = { id: "war", title: "War", categoryId: "event" };
    expect(
      resolveFocusQuery("Did she win an award?", elara, [...all, war]),
    ).toContain("(about Elara Voss)");
    expect(
      resolveFocusQuery("Did she fight in the war?", elara, [...all, war]),
    ).toBeNull();
  });

  it("keeps the query as-is when it already names the focus", () => {
    expect(
      resolveFocusQuery("Who trained her, the Grand Archmage?", elara, all),
    ).toBe("Who trained her, the Grand Archmage?");
  });

  it("does not tie a pronoun to a record of the wrong kind", () => {
    expect(resolveFocusQuery("Where was she born?", ashford, all)).toBeNull();
    expect(resolveFocusQuery("Who rules that city?", elara, all)).toBeNull();
    expect(resolveFocusQuery("What is it made of?", elara, all)).toBeNull();
  });

  it("accepts any pronoun when the focus category is unknown", () => {
    const custom = { id: "x", title: "The Veil", categoryId: "mystery" };
    expect(resolveFocusQuery("What is it?", custom, [custom])).toContain(
      "(about The Veil)",
    );
  });
});
