import { describe, it, expect } from "vitest";
import { ImportEngine } from "../../src/cc/engine";
import { FakeVaultWriter } from "./fixtures/fake-vault-writer";
import { kankaMinimal } from "./fixtures/kanka-minimal";
import type { CCImportPackage } from "../../src/cc/package";

const rules = {
  rules: [
    { when: { sourceType: "Character" }, thenType: "character" },
    { when: { sourceType: "Location" }, thenType: "location" },
  ],
  defaultType: "note",
};

function makeEngine() {
  return new ImportEngine(
    { writer: new FakeVaultWriter() },
    { mappingRules: rules },
  );
}

describe("prepare (session / preview)", () => {
  it("builds one PreviewItem per entity draft", async () => {
    const engine = makeEngine();
    const session = await engine.prepare(kankaMinimal);
    expect(session.items).toHaveLength(2);
  });

  it("sets resolvedType and sourceRef on each item", async () => {
    const engine = makeEngine();
    const session = await engine.prepare(kankaMinimal);
    const sara = session.items.find((i) => i.draft.title === "Sara Vane")!;
    expect(sara.resolvedType).toBe("character");
    expect(sara.sourceRef).toBe("kanka:Character:12345");
  });

  it("sets typeFallback when no rule matches", async () => {
    const engine = makeEngine();
    const pkg: CCImportPackage = {
      ...kankaMinimal,
      entityDrafts: [
        {
          sourceId: "99",
          sourceType: "Deity",
          title: "Athena",
          content: "",
          tags: [],
        },
      ],
    };
    const session = await engine.prepare(pkg);
    expect(session.items[0].typeFallback).toBe(true);
    expect(session.items[0].resolvedType).toBe("note");
  });

  it("defaults decision to include", async () => {
    const engine = makeEngine();
    const session = await engine.prepare(kankaMinimal);
    expect(session.items.every((i) => i.decision === "include")).toBe(true);
  });

  it("produces empty session for empty package", async () => {
    const engine = makeEngine();
    const pkg: CCImportPackage = {
      ...kankaMinimal,
      entityDrafts: [],
      relationshipDrafts: [],
    };
    const session = await engine.prepare(pkg);
    expect(session.items).toHaveLength(0);
    expect(session.relationships).toHaveLength(0);
  });
});

describe("setItemDecision", () => {
  it("toggles item to ignore", async () => {
    const { setItemDecision } = await import("../../src/cc/session");
    const engine = makeEngine();
    const session = await engine.prepare(kankaMinimal);
    const updated = setItemDecision(session, "12345", "ignore");
    const sara = updated.items.find((i) => i.draft.sourceId === "12345")!;
    expect(sara.decision).toBe("ignore");
    // other item unchanged
    const other = updated.items.find((i) => i.draft.sourceId === "678")!;
    expect(other.decision).toBe("include");
  });
});

describe("setItemType", () => {
  it("overrides resolvedType and clears typeFallback", async () => {
    const { setItemType } = await import("../../src/cc/session");
    const engine = makeEngine();
    const pkg: CCImportPackage = {
      ...kankaMinimal,
      entityDrafts: [
        {
          sourceId: "99",
          sourceType: "Deity",
          title: "Athena",
          content: "",
          tags: [],
        },
      ],
    };
    const session = await engine.prepare(pkg);
    expect(session.items[0].typeFallback).toBe(true);

    const updated = setItemType(session, "99", "character");
    expect(updated.items[0].resolvedType).toBe("character");
    expect(updated.items[0].typeFallback).toBe(false);
  });

  it("leaves other items unchanged", async () => {
    const { setItemType } = await import("../../src/cc/session");
    const engine = makeEngine();
    const session = await engine.prepare(kankaMinimal);
    const updated = setItemType(session, "12345", "item");
    const sara = updated.items.find((i) => i.draft.sourceId === "12345")!;
    expect(sara.resolvedType).toBe("item");
    const other = updated.items.find((i) => i.draft.sourceId === "678")!;
    expect(other.resolvedType).toBe("location");
  });
});
