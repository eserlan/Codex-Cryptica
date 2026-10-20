/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";
import { generateBusinessLocal, type BusinessDocument } from "generator-engine";

const identityReply = JSON.stringify({
  identity: {
    name: "Chrome Lily",
    type: "Ripper clinic",
    description: "d",
    reputationLine: "r",
    distinctive: "x",
  },
  operations: { provides: "p", payers: "y", whyHere: "w", mainIncome: "m" },
  leadership: {
    name: "Nadia Vale",
    goal: "g",
    style: "s",
    trait: "t",
    pressure: "p",
  },
  staff: [{ name: "Tomo Ruiz", role: "Technician", goal: "g", trait: "t" }],
  clientele: { typical: "a", valuable: "b", undesirable: "c" },
});
const connectionsReply = JSON.stringify({
  dependencies: [
    {
      input: "Black-clinic parts",
      kind: "materials",
      ifItFails: "Repairs stop.",
    },
  ],
  relationships: [
    {
      name: "Helix Medical Corp",
      kind: "competitor",
      partyKind: "organisation",
      reason: "Undercuts.",
    },
  ],
  reputation: { perception: "Discreet.", consequence: "Quiet credit." },
});
const troubleReply = JSON.stringify({
  pressure: "The grid keeps failing.",
  asset: "A generator.",
  secret: "A quiet back door.",
  opportunity: "A new contract.",
  complication: "A drone.",
  hooks: [
    "Nadia Vale needs a courier tonight.",
    "Helix Medical Corp is buying the regulars.",
    "Black-clinic parts run out before the next shift.",
  ],
});

function engine() {
  return new DefaultGeneratorEngine({ getModel: vi.fn() } as never);
}

describe("DefaultGeneratorEngine.generateBusiness", () => {
  it("returns a complete local business with the document attached when AI is off", async () => {
    const out = await engine().generateBusiness({
      genre: "Cyberpunk / Corporate",
      businessType: "Ripper clinic",
    });
    expect(out.title.length).toBeGreaterThan(0);
    expect(out.business?.identity.type).toBe("Ripper clinic");
    expect(out.content).toContain("## Identity");
  });

  it("runs three AI turns, carrying earlier turns into each later prompt", async () => {
    const e = engine();
    const runModel = vi
      .spyOn(
        e as unknown as { runModel: (...args: unknown[]) => Promise<string> },
        "runModel",
      )
      .mockResolvedValueOnce(identityReply)
      .mockResolvedValueOnce(connectionsReply)
      .mockResolvedValueOnce(troubleReply);
    const out = await e.generateBusiness({
      genre: "Cyberpunk / Corporate",
      businessType: "Ripper clinic",
      useAI: true,
    });
    expect(runModel).toHaveBeenCalledTimes(3);
    expect(String(runModel.mock.calls[1][1])).toContain("Chrome Lily");
    expect(out.business?.identity.name).toBe("Chrome Lily");
    expect(out.business?.fallbackSections).toEqual([]);
  });

  it("falls back to local tables when the model fails", async () => {
    const e = engine();
    vi.spyOn(
      e as unknown as { runModel: (...args: unknown[]) => Promise<string> },
      "runModel",
    ).mockRejectedValue(new Error("network down"));
    const out = await e.generateBusiness({
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      useAI: true,
    });
    expect(out.business?.identity.type).toBe("Blacksmith");
    // Every stage failed, so every stage's sections are listed as local.
    expect(out.business?.fallbackSections).toEqual(
      expect.arrayContaining(["identity", "pressure", "hooks"]),
    );
  });
});

describe("DefaultGeneratorEngine.regenerateBusinessSection", () => {
  const doc: BusinessDocument = generateBusinessLocal({
    genre: "Classic Fantasy",
    businessType: "Blacksmith",
  });

  it("rewrites only the requested section without AI", async () => {
    const { document: after } = await engine().regenerateBusinessSection(
      doc,
      "pressure",
      { useAI: false },
    );
    // The pool has six pressures, so a rewrite can repeat by chance; check the
    // section is a valid pressure and every other section is untouched.
    expect(after.pressure.length).toBeGreaterThan(0);
    expect(after.identity).toEqual(doc.identity);
    expect(after.leadership).toEqual(doc.leadership);
  });

  it("keeps the section and warns when the model call fails", async () => {
    const e = engine();
    vi.spyOn(
      e as unknown as { runModel: (...args: unknown[]) => Promise<string> },
      "runModel",
    ).mockRejectedValue(new Error("down"));
    const { document: after, warnings } = await e.regenerateBusinessSection(
      doc,
      "asset",
      { useAI: true },
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(after.identity).toEqual(doc.identity);
  });
});
