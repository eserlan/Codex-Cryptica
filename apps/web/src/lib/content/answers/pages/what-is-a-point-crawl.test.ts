import { describe, it, expect } from "vitest";
import { whatIsAPointCrawl } from "./what-is-a-point-crawl";

const exampleSection = whatIsAPointCrawl.sections.find(
  (section) => section.kind === "example",
);
const checklistSection = whatIsAPointCrawl.sections.find(
  (section) => section.kind === "checklist",
);
const listSection = whatIsAPointCrawl.sections.find(
  (section) => section.kind === "list",
);

describe("what-is-a-point-crawl editorial consistency (#4368)", () => {
  it("describes the Saltmere example with the four named points", () => {
    const intro =
      exampleSection?.kind === "example"
        ? exampleSection.paragraphs.join(" ")
        : "";

    expect(intro).toContain("Four named points");
    expect(intro).not.toContain("Six points");
  });

  it("does not require a hidden or conditional link in the readiness checklist", () => {
    const items =
      checklistSection?.kind === "checklist" ? checklistSection.items : [];

    expect(items.some((item) => /conditional|hidden|earned/i.test(item))).toBe(
      false,
    );
    expect(items.some((item) => /cost the party can weigh/i.test(item))).toBe(
      true,
    );
  });

  it("keeps hidden links optional in the definition", () => {
    const hidden =
      listSection?.kind === "list"
        ? listSection.items.find(
            (item) => item.term === "Hidden or conditional links",
          )
        : undefined;

    expect(hidden?.text.startsWith("Optional.")).toBe(true);
    expect(listSection?.kind === "list" ? listSection.intro : "").toContain(
      "only the first two are compulsory",
    );
  });
});
