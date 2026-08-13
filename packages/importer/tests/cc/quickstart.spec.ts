import { describe, it, expect } from "vitest";
import { ImportEngine, setItemDecision, setMatchDecision } from "../../src/cc";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { kankaMinimal } from "./fixtures/kanka-minimal";

const rules = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
  ],
  defaultType: "note",
};

describe("quickstart end-to-end", () => {
  it("full flow: prepare → curate → commit → verify source refs and report", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });

    // Prepare
    const session = await engine.prepare(kankaMinimal);
    expect(session.items).toHaveLength(2);
    expect(session.items.every((i) => i.decision === "include")).toBe(true);

    // Curate — ignore Rivertown
    const curated = setItemDecision(session, "678", "ignore");

    // Commit
    const report = await engine.commit(curated);

    // Only Sara created; Rivertown ignored
    expect(report.entitiesCreated).toBe(1);
    expect(report.itemsSkipped).toBe(1);

    // Sara carries discoverySource
    const sara = writer.allEntities().find((e) => e.title === "Sara Vane");
    expect(sara?.discoverySource).toBe("kanka:Character:12345");

    // Relationship unresolved because Rivertown was ignored
    expect(report.unresolvedReferences).toHaveLength(1);

    // Reconciliation
    expect(
      report.entitiesCreated +
        report.itemsSkipped +
        report.failures.filter((f) => f.stage === "entity").length,
    ).toBe(kankaMinimal.entityDrafts.length);
  });

  it("re-import detects match, update preserves vault-only fields", async () => {
    const writer = new FakeVaultWriter();
    const engine = new ImportEngine({ writer }, { mappingRules: rules });

    // First import
    await engine.commit(await engine.prepare(kankaMinimal));
    const saraId = writer
      .allEntities()
      .find((e) => e.title === "Sara Vane")!.id;

    // Simulate user adding image
    await writer.updateEntity(saraId, { metadata: { image: "portrait.jpg" } });

    // Re-import with updated content; choose update for Sara, skip for Rivertown
    let s2 = await engine.prepare({
      ...kankaMinimal,
      entityDrafts: [
        { ...kankaMinimal.entityDrafts[0], content: "Updated bio." },
        kankaMinimal.entityDrafts[1],
      ],
    });
    s2 = setMatchDecision(s2, "12345", "update");

    const report = await engine.commit(s2);
    expect(report.entitiesUpdated).toBe(1);

    const sara = writer.getEntity(saraId)!;
    expect(sara.content).toBe("Updated bio."); // overwritten
    expect(sara.metadata?.image).toBe("portrait.jpg"); // preserved
    expect(sara.discoverySource).toBe("kanka:Character:12345"); // stable
  });
});
