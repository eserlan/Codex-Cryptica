import { describe, expect, it } from "vitest";
import { buildReport } from "./build-report";
import { DEFAULT_REPORT_INCLUDE } from "./defaults";
import { renderReportMarkdown } from "./markdown";
import { entity, options, sampleInput } from "./test-fixtures";

describe("renderReportMarkdown", () => {
  it("emits the fixed heading grammar", () => {
    const md = renderReportMarkdown(buildReport(sampleInput(), options()));
    expect(md.startsWith("## Overview")).toBe(true);
    expect(md).toContain("### Vargas");
    expect(md).toContain("## Factions");
    expect(md).toContain("## Relationship Summary");
    expect(md).toContain("- Vargas — friend → Lajos");
    expect(md).toContain("**Affiliations:** Black Eagles");
  });

  it("omits relationship headings when there are none", () => {
    const md = renderReportMarkdown(
      buildReport(
        { entities: [entity("a")], relationships: [], factionMembership: {} },
        options(),
      ),
    );
    expect(md).not.toContain("Relationship Summary");
    expect(md).not.toContain("**Relationships**");
    expect(md).not.toContain("## Factions");
  });

  it("marks GM-only text and demotes note headings", () => {
    const md = renderReportMarkdown(
      buildReport(sampleInput(), {
        ...options({ detail: "standard" }),
        include: { ...DEFAULT_REPORT_INCLUDE, gmOnlySecrets: true },
      }),
    );
    expect(md).toContain("> **GM only:** Is the spy.");
    expect(md).toContain("#### History");
    expect(md).not.toMatch(/^## History/m);
  });

  it("has one ### heading per entity for 200 entities", () => {
    const entities = Array.from({ length: 200 }, (_, i) => entity(`e${i}`));
    const md = renderReportMarkdown(
      buildReport(
        { entities, relationships: [], factionMembership: {} },
        options(),
      ),
    );
    expect(md.match(/^### /gm)).toHaveLength(200);
  });
});

describe("renderReportMarkdown locations", () => {
  it("lists where a place sits and what it contains", () => {
    const md = renderReportMarkdown(
      buildReport(
        {
          entities: [
            entity("realm", { title: "Realm", type: "location" }),
            entity("keep", {
              title: "Keep",
              type: "location",
              parent: "realm",
            }),
          ],
          relationships: [],
          factionMembership: {},
        },
        options(),
      ),
    );
    expect(md).toContain("**Located in:** Realm");
    expect(md).toContain("**Contains:** Keep");
  });
});
