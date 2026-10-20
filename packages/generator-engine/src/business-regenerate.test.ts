import { describe, expect, it, vi } from "vitest";
import {
  regenerateBusinessSection,
  propagateRename,
} from "./business-regenerate";
import { generateBusinessLocal } from "./business-local";
import { checkBusiness } from "./business-checks";
import { seeded } from "./business-test-helpers";

function doc(seed = 21) {
  return generateBusinessLocal(
    { genre: "Classic Fantasy", businessType: "Blacksmith", scale: "small" },
    seeded(seed),
  );
}

describe("regenerateBusinessSection (offline)", () => {
  it("changes only the requested section", async () => {
    const before = doc();
    // The pressure pool is small, so one seed can repeat it; try several.
    const pressures = new Set<string>();
    for (const seed of [5, 6, 7, 8, 9, 10]) {
      const { document: after } = await regenerateBusinessSection(
        before,
        "pressure",
        { useAI: false, rng: seeded(seed) },
      );
      pressures.add(after.pressure);
      expect(after.identity).toEqual(before.identity);
      expect(after.operations).toEqual(before.operations);
      expect(after.leadership).toEqual(before.leadership);
      expect(after.clientele).toEqual(before.clientele);
      expect(after.secret).toEqual(before.secret);
      expect(checkBusiness(after)).toEqual([]);
    }
    expect([...pressures].some((p) => p !== before.pressure)).toBe(true);
  });

  it("rebuilds one staff member and keeps the others", async () => {
    const before = doc();
    if (before.staff.length < 2) return;
    const target = before.staff[0].id;
    const { document: after } = await regenerateBusinessSection(
      before,
      `staff:${target}`,
      {
        useAI: false,
        rng: seeded(6),
      },
    );
    expect(after.staff.find((p) => p.id === target)?.name).toBeDefined();
    expect(after.staff.slice(1)).toEqual(before.staff.slice(1));
  });
});

describe("regenerateBusinessSection (AI)", () => {
  it("applies a usable AI reply with the steer in the request", async () => {
    const send = vi.fn(async (_message: string) =>
      JSON.stringify({ pressure: "The harbour dues have trebled." }),
    );
    const before = doc();
    const { document: after, warnings } = await regenerateBusinessSection(
      before,
      "pressure",
      {
        useAI: true,
        instruction: "make it about the harbour",
        send,
      },
    );
    expect(after.pressure).toBe("The harbour dues have trebled.");
    expect(warnings).toEqual([]);
    expect(send.mock.calls[0][0]).toContain("make it about the harbour");
  });

  it("recomputes the unintroduced-names notice after a rewrite", async () => {
    const stale = { ...doc(), warnings: ["Edran Pell"] };
    stale.pressure = "Edran Pell holds the keys and Edran Pell wants rent.";
    const { document: after } = await regenerateBusinessSection(
      stale,
      "pressure",
      { useAI: false, rng: seeded(3) },
    );
    expect(after.warnings).toBeUndefined();

    const { document: introduced } = await regenerateBusinessSection(
      doc(),
      "pressure",
      {
        useAI: true,
        send: async () =>
          JSON.stringify({
            pressure: "Wen Harrow and Wen Harrow's crew want the shop.",
          }),
      },
    );
    expect(introduced.warnings).toContain("Wen Harrow");
  });

  it("falls back to the tables and warns when the AI reply is unusable", async () => {
    const before = doc();
    const { document: after, warnings } = await regenerateBusinessSection(
      before,
      "pressure",
      {
        useAI: true,
        send: async () => "not json",
        rng: seeded(7),
      },
    );
    expect(after.pressure).not.toBe("");
    expect(warnings.length).toBeGreaterThan(0);
    expect(after.identity).toEqual(before.identity);
  });

  it("does not call the model when AI is off", async () => {
    const send = vi.fn(async () => "{}");
    await regenerateBusinessSection(doc(), "asset", {
      useAI: false,
      send,
      rng: seeded(8),
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("propagates cancellation and leaves the document unchanged", async () => {
    const controller = new AbortController();
    const before = doc();
    const send = async () => {
      controller.abort();
      throw new DOMException("cancelled", "AbortError");
    };
    await expect(
      regenerateBusinessSection(before, "pressure", {
        useAI: true,
        send,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });
});

describe("renaming a person", () => {
  it("replaces the old name in other sections and nothing else", async () => {
    const before = doc(22);
    const oldName = before.leadership.name;
    const { document: after, renamed } = await regenerateBusinessSection(
      before,
      "leadership",
      {
        useAI: false,
        rng: seeded(9),
      },
    );
    expect(renamed).toEqual({ from: oldName, to: after.leadership.name });
    expect(JSON.stringify(after)).not.toContain(oldName);
    expect(after.secret).toBe(
      before.secret.replaceAll(oldName, after.leadership.name),
    );
    expect(after.options).toEqual(before.options);
  });

  it("matches whole words only", () => {
    const d = doc(23);
    const renamed = propagateRename(
      { ...d, pressure: "Maralyn owes the bank." },
      "Mara",
      "Iska",
      "leadership",
    );
    expect(renamed.pressure).toBe("Maralyn owes the bank.");
  });

  it("leaves the campaign context alone", () => {
    const d = {
      ...doc(24),
      options: { ...doc(24).options, campaignContext: "Mara is the queen." },
    };
    const renamed = propagateRename(d, "Mara", "Iska", "leadership");
    expect(renamed.options.campaignContext).toBe("Mara is the queen.");
  });
});

describe("AI rewrite gating", () => {
  it("applies an AI rewrite of one section even when an unrelated hook is unanchored", async () => {
    const d = {
      ...doc(25),
      hooks: ["Something with no anchor whatsoever here."],
    };
    const { document: after, warnings } = await regenerateBusinessSection(
      d,
      "pressure",
      {
        useAI: true,
        send: async () =>
          JSON.stringify({ pressure: "The harbour dues have trebled." }),
      },
    );
    expect(after.pressure).toBe("The harbour dues have trebled.");
    expect(warnings).toEqual([]);
  });
});

describe("section rewrite context", () => {
  it("gives the model the established facts so it keeps names consistent", async () => {
    const d = doc(26);
    const send = vi.fn(async (_message: string) =>
      JSON.stringify({ pressure: "The harbour dues have trebled." }),
    );
    await regenerateBusinessSection(d, "pressure", { useAI: true, send });
    const message = send.mock.calls[0][0];
    expect(message).toContain("Established facts");
    expect(message).toContain(d.identity.name);
    expect(message).toContain(d.leadership.name);
    expect(message).toMatch(
      /refer only to the people and parties already established/i,
    );
  });
});
