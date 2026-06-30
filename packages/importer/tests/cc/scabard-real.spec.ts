import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseScabardExport } from "../../src/cc/scabard";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";

import { resolve } from "path";

describe("Scabard Real Campaign Import Integration", () => {
  const jsonPath = resolve(
    __dirname,
    "./fixtures/london-calling-campaign.json",
  );

  it("should parse and import the real Scabard campaign and establish connections correctly", async () => {
    const rawData = readFileSync(jsonPath, "utf-8");
    const pkg = parseScabardExport(rawData);

    // Verify parsed package properties
    expect(pkg.sourceSystem).toBe("scabard");
    expect(pkg.entityDrafts.length).toBeGreaterThan(0);
    expect(pkg.relationshipDrafts).toHaveLength(8);
    expect(
      pkg.entityDrafts.find((draft) => draft.title === "Benjamin Bowman")
        ?.image,
    ).toBe(
      "https://img.alchemyrpg.com/users/6448af0b5ae9a95f29b36d0c/characters/67c9f54736c8fa8f1ef54391/m7z88k07.jpg",
    );
    expect(
      pkg.entityDrafts.find(
        (draft) => draft.title === "1 - Chapter One: The Ghost Town",
      )?.image,
    ).toBe("https://www.scabard.com/assets/rf_images/event/30118617_s_1.jpg");
    expect(pkg.warnings).toContainEqual(
      expect.objectContaining({
        code: "SCABARD_CONNECTION_SUMMARY",
        message: expect.stringContaining(
          "93 connections: 8 imported as links, 85 treated as classification metadata",
        ),
      }),
    );

    const writer = new FakeVaultWriter();
    const engine = new ImportEngine(
      { writer },
      {
        mappingRules: {
          rules: [
            { when: { sourceType: "Character" }, thenType: "character" },
            { when: { sourceType: "Location" }, thenType: "location" },
          ],
          defaultType: "note",
        },
      },
    );

    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);

    // Verify import stats
    expect(report.failures.length).toBe(0);
    expect(report.entitiesCreated).toBe(pkg.entityDrafts.length);
    expect(report.relationshipsCreated).toBeGreaterThan(0);

    // Verify that connections are established on the created entities
    const entities = writer.allEntities();
    const benjamin = entities.find((e) => e.title === "Benjamin Bowman");
    expect(benjamin).toBeDefined();
    expect(benjamin?.image).toBe(
      "https://img.alchemyrpg.com/users/6448af0b5ae9a95f29b36d0c/characters/67c9f54736c8fa8f1ef54391/m7z88k07.jpg",
    );

    // Benjamin Bowman should have 2 connections (Member Of the Coterie, and Participant Of Chapter One)
    expect(benjamin?.connections).toBeDefined();
    expect(benjamin?.connections?.length).toBe(2);

    const connection1 = benjamin?.connections?.[0];
    expect(connection1?.type).toBe("member_of");
    expect(connection1?.label).toBe("Member Of");

    const connection2 = benjamin?.connections?.[1];
    expect(connection2?.type).toBe("participant_of");
    expect(connection2?.label).toBe("Participant Of");
  });

  it("should throw a parsing error if the JSON is malformed", () => {
    expect(() => parseScabardExport("{invalid json")).toThrow();
  });

  it("should report unresolved references if a connection target does not exist in the campaign", async () => {
    const rawData = readFileSync(jsonPath, "utf-8");
    const pkg = parseScabardExport(rawData);

    // Modify a relationship draft to point to a non-existent target id
    if (pkg.relationshipDrafts.length > 0) {
      pkg.relationshipDrafts[0].toRef = "non-existent-id";
    }

    const writer = new FakeVaultWriter();
    const engine = new ImportEngine(
      { writer },
      {
        mappingRules: {
          rules: [{ when: { sourceType: "Character" }, thenType: "character" }],
          defaultType: "note",
        },
      },
    );

    const session = await engine.prepare(pkg);
    const report = await engine.commit(session);

    // Should report the unresolved reference instead of crashing
    expect(report.unresolvedReferences.length).toBeGreaterThan(0);
    expect(report.unresolvedReferences[0].toRef).toBe("non-existent-id");
  });
});
