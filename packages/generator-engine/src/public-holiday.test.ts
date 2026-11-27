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

  it("asks for short scannable lore and summary rather than dense prose", () => {
    const { userMessage } = buildHolidayPrompt({});
    expect(userMessage).toContain("scannable GM reference");
    expect(userMessage).toContain("one or two plain sentences");
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
    const hiddenTruth = contested.observances?.[0]?.hiddenTruth;
    expect(hiddenTruth).toBeTruthy();
    expect(contested.content).not.toContain(hiddenTruth);
  });

  it("parses valid JSON and safely falls back for malformed JSON", () => {
    const resolved = resolveHoliday({ setSize: "One observance" });
    const completeObservance = {
      name: "Clearwater Vigil",
      type: "Memorial",
      when: "The first thaw",
      observers: "The river families",
      origin: "It recalls a flood survived together.",
      traditions: "Carry lights to the water.",
      foodOrDress: "Wear river-blue sashes.",
      taboos: "Do not cast offerings into the channel.",
      variations: "Upstream families sing a different verse.",
      outsiderMisunderstanding: "Visitors mistake the silence for mourning.",
      publicBelief: "The vigil honours shared rescue.",
      tension: "The old flood record has gone missing.",
    };
    const completeContent = Object.values(completeObservance).join("\n");
    expect(
      parseHolidayResponse(
        JSON.stringify({
          title: "Clearwater Vigil",
          content: completeContent,
          observances: [completeObservance],
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

  it("falls back when an AI observance omits origin or expanded details", () => {
    const resolved = resolveHoliday({ setSize: "One observance" });
    const completeObservance = {
      name: "Clearwater Vigil",
      type: "Memorial",
      when: "The first thaw",
      observers: "The river families",
      origin: "It recalls a flood survived together.",
      traditions: "Carry lights to the water.",
      foodOrDress: "Wear river-blue sashes.",
      taboos: "Do not cast offerings into the channel.",
      variations: "Upstream families sing a different verse.",
      outsiderMisunderstanding: "Visitors mistake the silence for mourning.",
      publicBelief: "The vigil honours shared rescue.",
      tension: "The old flood record has gone missing.",
    };
    const missingOrigin = { ...completeObservance };
    delete (missingOrigin as Partial<typeof completeObservance>).origin;
    const base = {
      title: "Clearwater Vigil",
      content: Object.values(completeObservance).join("\n"),
    };

    expect(
      parseHolidayResponse(
        JSON.stringify({ ...base, observances: [missingOrigin] }),
        resolved,
      ).title,
    ).not.toBe("Clearwater Vigil");

    expect(
      parseHolidayResponse(
        JSON.stringify({
          ...base,
          content: "Clearwater Vigil\nThe first thaw",
          observances: [completeObservance],
        }),
        resolved,
      ).title,
    ).not.toBe("Clearwater Vigil");

    const controversialResolved = resolveHoliday({
      setSize: "One observance",
      includeControversial: true,
    });
    const fallbackWithControversial = parseHolidayResponse(
      JSON.stringify({ ...base, observances: [missingOrigin] }),
      controversialResolved,
    );
    expect(fallbackWithControversial.title).not.toBe("Clearwater Vigil");
    expect(
      fallbackWithControversial.observances?.[0]?.hiddenTruth,
    ).toBeTruthy();
    expect(fallbackWithControversial.lore).toContain(
      fallbackWithControversial.observances?.[0]?.hiddenTruth ?? "",
    );

    const leakedHiddenTruth = "The council burned the original treaty.";
    const leakedResult = parseHolidayResponse(
      JSON.stringify({
        ...base,
        content: `${base.content}\n${leakedHiddenTruth}`,
        observances: [
          { ...completeObservance, hiddenTruth: leakedHiddenTruth },
        ],
      }),
      controversialResolved,
    );
    expect(leakedResult.content).not.toContain(leakedHiddenTruth);

    const summaryLeakedResult = parseHolidayResponse(
      JSON.stringify({
        ...base,
        summary: `A vigil hiding a secret: ${leakedHiddenTruth}`,
        observances: [
          { ...completeObservance, hiddenTruth: leakedHiddenTruth },
        ],
      }),
      controversialResolved,
    );
    expect(summaryLeakedResult.summary).not.toContain(leakedHiddenTruth);
  });

  it("writes a single observance summary as a capitalised sentence that names it", () => {
    const out = generateHolidayLocal({ setSize: "One observance" }, () => 0.3);
    expect(out.summary).toMatch(/^[A-Z]/);
    expect(out.summary).toContain(`${out.title} is marked each year at `);
    expect(out.summary).not.toMatch(/^[a-z]/);
  });

  it("keeps the scope's article lowercase in calendar titles, overviews and summaries", () => {
    const out = generateHolidayLocal(
      { scope: "A nation", setSize: "A calendar of 3 observances" },
      () => 0.3,
    );
    expect(out.title).toBe("Calendar for a nation");
    expect(out.summary).toContain("for a nation,");
    expect(out.content).toContain("across a nation,");
    expect(out.title).not.toMatch(/A nation/);
    expect(out.summary).not.toMatch(/ A nation/);
    expect(out.content).not.toMatch(/(across|for|of) A nation/);
  });

  it("does not paste free-text culture into the summary", () => {
    const out = generateHolidayLocal(
      {
        setSize: "One observance",
        culture: "Orbital dockworkers share water under a fragile compact",
      },
      () => 0.3,
    );
    expect(out.summary).not.toContain("Orbital dockworkers");
    expect(out.summary).toMatch(/shaped by .+\.$/);
  });
});
