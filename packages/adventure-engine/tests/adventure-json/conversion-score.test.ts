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

const sparseDoc = readJson(
  "fixtures/adventures/reference-one-shot/variants/sparse.v1.json",
);

const COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
];
const idsByCollection = (doc: Record<string, { id: string }[]>) =>
  Object.fromEntries(
    COLLECTIONS.map((c) => [c, (doc[c] ?? []).map((e) => e.id).sort()]),
  );

const clone = <T>(value: T): T => structuredClone(value);

describe("scoreAdventureConversion positive controls", () => {
  it("passes the reference conversion", () => {
    const result = scoreAdventureConversion(refDoc, refKey);
    expect(result.overall).toBe("pass");
    expect(result.dimensions.authoredVsRumour.status).toBe("n/a");
    expect(result.dimensions.fidelity.status).toBe("pass");
    for (const [name, dim] of Object.entries(result.dimensions)) {
      expect(["pass", "n/a"]).toContain(dim.status);
      expect(name).toBeTruthy();
    }
  });

  it("passes the mystery conversion on every dimension", () => {
    const result = scoreAdventureConversion(mysteryDoc, mysteryKey);
    expect(result.overall).toBe("pass");
    for (const [name, dim] of Object.entries(result.dimensions)) {
      expect(dim.status).toBe(name === "fidelity" ? "n/a" : "pass");
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

describe("scoreAdventureConversion fidelity", () => {
  it("fails the sparse ID-complete variant on fidelity only among structure checks", () => {
    const result = scoreAdventureConversion(sparseDoc, refKey);
    expect(idsByCollection(sparseDoc)).toEqual(idsByCollection(refDoc));
    expect(result.overall).toBe("fail");
    for (const name of [
      "schema",
      "references",
      "citations",
      "truncation",
    ] as const) {
      expect(result.dimensions[name].status).toBe("pass");
    }
    const fidelity = result.dimensions.fidelity;
    expect(fidelity.status).toBe("fail");
    const lines = fidelity.details.join("\n");
    for (const category of ["trigger", "clue", "consequence"]) {
      expect(lines).toContain(`missing ${category} detail`);
    }
    expect(
      fidelity.details.some(
        (d) =>
          d.includes("ros-scene-3-wheel-room") &&
          d.includes("enc-wheel-room-wick") &&
          d.includes("Wick yields if his hound is hurt"),
      ),
    ).toBe(true);
  });

  it("a single record that lost the lever and flood trigger fails fidelity only", () => {
    const doc = clone(refDoc);
    const scene = doc.scenes.find(
      (s: { id: string }) => s.id === "ros-scene-3-wheel-room",
    );
    delete scene.conditions;
    doc.secrets = doc.secrets.filter(
      (s: { id: string }) => s.id !== "secret-cellar-flood",
    );
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.coverage.status).toBe("pass");
    expect(result.dimensions.fidelity.status).toBe("fail");
    expect(result.dimensions.fidelity.details).toHaveLength(1);
    const finding = result.dimensions.fidelity.details[0]!;
    expect(finding).toContain("ros-scene-3-wheel-room");
    expect(finding).toContain("missing trigger detail");
    expect(finding).toContain(
      "loc-wheel-room, ros-scene-3-wheel-room, enc-wheel-room-wick, secret-wick-wages",
    );
  });

  it("reports a section no record cites", () => {
    const doc = clone(refDoc);
    const key = clone(refKey);
    key.sections.push({ sourceId: "ros-extra", title: "Extra Room" });
    key.actionableDetails = [
      {
        sourceId: "ros-extra",
        category: "situation",
        detail: "A hidden stair behind the millstone.",
      },
    ];
    const result = scoreAdventureConversion(doc, key);
    expect(result.dimensions.fidelity.details.join("\n")).toContain(
      "no record cites this section",
    );
  });

  it("does not count a detail found only in an unresolved record", () => {
    const doc = clone(refDoc);
    const scene = doc.scenes.find(
      (s: { id: string }) => s.id === "ros-scene-3-wheel-room",
    );
    delete scene.conditions;
    doc.secrets = doc.secrets.filter(
      (s: { id: string }) => s.id !== "secret-cellar-flood",
    );
    doc.unresolved.push({
      id: "unresolved-lever",
      code: "dropped-detail",
      message:
        "Once the lever is pulled, the wheel turns and the cellar water starts to rise, leaving about five turns to finish the cellar.",
      epistemicStatus: "unresolved",
      sourceRef: {
        section: "Scene 3: The Wheel Room",
        anchor: "ros-scene-3-wheel-room",
      },
    });
    const result = scoreAdventureConversion(doc, refKey);
    expect(result.dimensions.schema.status).toBe("pass");
    expect(result.dimensions.fidelity.status).toBe("fail");
    expect(result.dimensions.fidelity.details.join("\n")).not.toContain(
      "unresolved-lever",
    );
  });

  it("is n/a when the key has no actionableDetails", () => {
    const key = clone(refKey);
    delete key.actionableDetails;
    expect(scoreAdventureConversion(refDoc, key).dimensions.fidelity).toEqual({
      status: "n/a",
      details: [],
    });
  });
});

describe("ConversionAnswerKeySchema actionableDetails", () => {
  const raw = () =>
    readJson("fixtures/adventures/reference-one-shot/answer-key.json");

  it("accepts the reference key", () => {
    expect(ConversionAnswerKeySchema.safeParse(raw()).success).toBe(true);
  });

  it("rejects an unknown sourceId", () => {
    const key = raw();
    key.actionableDetails[0].sourceId = "ros-nowhere";
    expect(ConversionAnswerKeySchema.safeParse(key).success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const key = raw();
    key.actionableDetails[0].category = "flavour";
    expect(ConversionAnswerKeySchema.safeParse(key).success).toBe(false);
  });
});
