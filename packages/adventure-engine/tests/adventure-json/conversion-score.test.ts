import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ConversionAnswerKeySchema,
  scoreAdventureConversion,
} from "../../src/adventure-json/conversion-score";

const root = resolve(__dirname, "../../../..");
const readJson = (rel: string) =>
  JSON.parse(readFileSync(resolve(root, rel), "utf8"));

const refKey = ConversionAnswerKeySchema.parse(
  readJson("fixtures/adventures/reference-one-shot/answer-key.json"),
);
const refDoc = readJson(
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
);
const mysteryKey = ConversionAnswerKeySchema.parse(
  readJson("fixtures/adventures/mystery/answer-key.json"),
);
const mysteryDoc = readJson("fixtures/adventures/mystery/adventure.v1.json");

const clone = <T>(value: T): T => structuredClone(value);

describe("scoreAdventureConversion positive controls", () => {
  it("passes the reference conversion", () => {
    const result = scoreAdventureConversion(refDoc, refKey);
    expect(result.overall).toBe("pass");
    expect(result.dimensions.authoredVsRumour.status).toBe("n/a");
    for (const [name, dim] of Object.entries(result.dimensions)) {
      expect(["pass", "n/a"]).toContain(dim.status);
      expect(name).toBeTruthy();
    }
  });

  it("passes the mystery conversion on every dimension", () => {
    const result = scoreAdventureConversion(mysteryDoc, mysteryKey);
    expect(result.overall).toBe("pass");
    for (const dim of Object.values(result.dimensions)) {
      expect(dim.status).toBe("pass");
    }
  });
});

describe("scoreAdventureConversion blocking failures", () => {
  it("removed secret fails secrets but keeps schema pass", () => {
    const doc = clone(refDoc);
    doc.secrets = doc.secrets.filter(
      (s: { id: string }) => s.id !== "secret-filed-pin",
    );
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.schema.status).toBe("pass");
    expect(result.dimensions.secrets.status).toBe("fail");
    expect(result.dimensions.secrets.details.join("\n")).toContain(
      "secret-filed-pin",
    );
    expect(result.overall).toBe("fail");
  });

  it("leaked secret fails secrets but keeps schema pass", () => {
    const doc = clone(refDoc);
    const secret = doc.secrets.find(
      (s: { id: string }) => s.id === "secret-filed-pin",
    );
    const scene = doc.scenes.find(
      (s: { id: string }) => s.id === "ros-scene-2-yard",
    );
    scene.readAloud = secret.text;
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.schema.status).toBe("pass");
    expect(result.dimensions.secrets.status).toBe("fail");
    expect(result.dimensions.secrets.details.join("\n")).toMatch(/leak/i);
    expect(result.overall).toBe("fail");
  });

  it("removed last ending fails truncation and coverage", () => {
    const doc = clone(refDoc);
    doc.endings = doc.endings.filter(
      (e: { id: string }) => e.id !== "ending-flooded",
    );
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.truncation.status).toBe("fail");
    expect(result.dimensions.coverage.status).toBe("fail");
  });

  it("ending cited by section title counts as covered", () => {
    const doc = clone(refDoc);
    const ending = doc.endings.find(
      (e: { id: string }) => e.id === "ending-restored",
    );
    delete ending.sourceRef.anchor;
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.coverage.status).toBe("pass");
  });

  it("ending cited by entity id equal to sourceId counts as covered", () => {
    const doc = clone(refDoc);
    const ending = doc.endings.find(
      (e: { id: string }) => e.id === "ending-restored",
    );
    ending.id = "ros-ending-restored";
    delete ending.sourceRef.anchor;
    delete ending.sourceRef.section;
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.coverage.status).toBe("pass");
  });

  it("leaked secret in a nested branch description fails secrets", () => {
    const doc = clone(refDoc);
    const secret = doc.secrets.find(
      (s: { id: string }) => s.id === "secret-filed-pin",
    );
    const scene = doc.scenes.find(
      (s: { id: string }) => s.id === "ros-scene-1-landing",
    );
    scene.branches[0].description = secret.text;
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.schema.status).toBe("pass");
    expect(result.dimensions.secrets.status).toBe("fail");
    expect(result.dimensions.secrets.details.join("\n")).toMatch(/leak/i);
  });

  it("unknown anchor fails citations and lists it", () => {
    const doc = clone(refDoc);
    doc.locations[0].sourceRef.anchor = "ros-unknown";
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.citations.status).toBe("fail");
    expect(result.dimensions.citations.details.join("\n")).toContain(
      "ros-unknown",
    );
  });

  it("wrong testimony truth fails authoredVsRumour", () => {
    const doc = clone(mysteryDoc);
    const rumour = doc.rumours.find(
      (r: { id: string }) => r.id === "rumour-sexton-bell",
    );
    rumour.truth = "true";
    const result = scoreAdventureConversion(doc, mysteryKey);
    expect(result.dimensions.authoredVsRumour.status).toBe("fail");
  });

  it("removed optional flags fail branches", () => {
    const doc = clone(refDoc);
    const scene = doc.scenes.find(
      (s: { id: string }) => s.id === "ros-branch-shrine",
    );
    delete scene.optional;
    for (const sc of doc.scenes) {
      for (const branch of sc.branches ?? []) delete branch.optional;
    }
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.branches.status).toBe("fail");
  });

  it("invalid input fails every dimension with no pass anywhere", () => {
    const result = scoreAdventureConversion({}, refKey);
    expect(result.dimensions.schema.status).toBe("fail");
    for (const [name, dim] of Object.entries(result.dimensions)) {
      expect(dim.status).toBe("fail");
      if (name !== "schema") {
        expect(dim.details).toContain("not checked: schema invalid");
      }
    }
    expect(
      Object.values(result.dimensions).some((d) => d.status === "pass"),
    ).toBe(false);
    expect(result.overall).toBe("fail");
  });

  it("repair iterations echo the option and default to null", () => {
    expect(
      scoreAdventureConversion(refDoc, refKey, { repairIterations: 2 })
        .repairIterations,
    ).toBe(2);
    expect(
      scoreAdventureConversion(refDoc, refKey).repairIterations,
    ).toBeNull();
  });
});

describe("scoreAdventureConversion on existing model fixtures", () => {
  it.each(["claude-adventure.v1.json", "gpt-adventure.v1.json"])(
    "scores %s as schema pass but secrets and overall fail",
    (file) => {
      const doc = readJson(`fixtures/adventures/conversions/${file}`);
      const result = scoreAdventureConversion(doc, refKey);
      expect(result.dimensions.schema.status).toBe("pass");
      expect(result.dimensions.secrets.status).toBe("fail");
      expect(result.overall).toBe("fail");
    },
  );
});
