import { describe, expect, it } from "vitest";
import {
  buildHolidayPrompt,
  generateHolidayLocal,
  parseHolidayResponse,
  resolveHoliday,
} from "./public-holiday";

describe("public holiday generator", () => {
  it("asks for string content and lore so previews can stream them", () => {
    const { userMessage } = buildHolidayPrompt({});
    expect(userMessage).toContain("single Markdown string");
    expect(userMessage).toContain("never a nested object or array");
  });

  it("resolves one observance and calendar sizes from the form", () => {
    expect(
      resolveHoliday({ setSize: "A calendar of 10 observances" }).count,
    ).toBe(10);
    expect(
      resolveHoliday({ setSize: "A calendar of 4 observances" }).count,
    ).toBe(4);
    expect(resolveHoliday({ setSize: "One observance" }).count).toBe(1);
    expect(
      resolveHoliday({ setSize: "A calendar of 200 observances" }).count,
    ).toBe(1);
  });

  it("uses supplied cultural and historical context in the prompt", () => {
    const prompt = buildHolidayPrompt({
      genre: "Cyberpunk",
      scope: "A faction",
      culture: "Orbital dockworkers share water under a fragile compact",
      importantPeople: "Mara Venn, strike organiser",
      importantEvents: "The airlock strike",
      setSize: "A calendar of 6 observances",
      avoidNames: ["Lanterns for the Returning Tide"],
    });
    expect(prompt.userMessage).toContain("Orbital dockworkers");
    expect(prompt.userMessage).toContain("Mara Venn");
    expect(prompt.userMessage).toContain("The airlock strike");
    expect(prompt.userMessage).toContain("exactly 6 observances");
    expect(prompt.userMessage).toContain("Lanterns for the Returning Tide");
    expect(prompt.userMessage).toContain("consistency pass");
    expect(prompt.userMessage).toContain(
      "Missing context is an invitation to make grounded choices",
    );
    expect(prompt.userMessage).toContain(
      "Do not abbreviate later entries to headings and metadata",
    );
    expect(prompt.userMessage).toContain("arbitrary coloured threads");
  });

  it("generates deterministic, structured single and calendar results", () => {
    const rng = () => 0.21;
    const single = generateHolidayLocal({ setSize: "One observance" }, rng);
    expect(single).toEqual(
      generateHolidayLocal({ setSize: "One observance" }, () => 0.21),
    );
    expect(single.observances).toHaveLength(1);
    const avoided = generateHolidayLocal(
      { setSize: "One observance", avoidNames: [single.title] },
      rng,
    );
    expect(avoided.title).not.toBe(single.title);
    const calendar = generateHolidayLocal(
      { setSize: "A calendar of 6 observances" },
      rng,
    );
    expect(calendar.observances).toHaveLength(6);
    expect(new Set(calendar.observances?.map((day) => day.name)).size).toBe(6);
    expect(calendar.content).toContain("Calendar overview");
    expect(calendar.observances?.[0]?.tension).toBeTruthy();
    expect(calendar.lore).toContain("Use at the table");
    expect(calendar.lore).not.toContain("GM-only history");
    const contested = generateHolidayLocal(
      {
        setSize: "A calendar of 6 observances",
        includeControversial: true,
      },
      rng,
    );
    expect(contested.lore).toContain("GM-only history");
  });

  it("parses valid JSON and safely falls back for malformed JSON", () => {
    const resolved = resolveHoliday({ setSize: "One observance" });
    expect(
      parseHolidayResponse(
        JSON.stringify({
          title: "Clearwater Vigil",
          content: "A vigil",
          observances: [
            {
              name: "Clearwater Vigil",
              type: "Memorial",
              when: "The first thaw",
              observers: "The river families",
              traditions: "Carry lights",
              tension: "The record is missing.",
            },
          ],
        }),
        resolved,
      ).title,
    ).toBe("Clearwater Vigil");
    expect(parseHolidayResponse("not json", resolved).observances).toHaveLength(
      1,
    );
    expect(parseHolidayResponse("null", resolved).observances).toHaveLength(1);
    expect(
      parseHolidayResponse(
        JSON.stringify({ observances: [{ name: "Missing fields" }] }),
        resolved,
      ).observances,
    ).toHaveLength(1);
  });
});
