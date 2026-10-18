import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeDir, asHandle } from "./fake-dir";

vi.mock("../../utils/opfs", () => ({
  writeOpfsFile: vi.fn(async (path: string[], content: string, root: any) => {
    root.put(path, content);
  }),
  deleteOpfsEntry: vi.fn(async (root: any, path: string[]) => {
    root.remove(path);
  }),
  isNotFoundError: (e: any) => e?.name === "NotFoundError",
}));

import { EntityTemplateRepository } from "./entity-template-repository";

const stored = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    id: "u1",
    name: "Mine",
    entityType: "character",
    markdown: "## A\n",
    ...over,
  });

describe("EntityTemplateRepository", () => {
  let repo: EntityTemplateRepository;
  let vault: FakeDir;

  beforeEach(() => {
    repo = new EntityTemplateRepository();
    vault = new FakeDir("vault-1");
  });

  it("saves a template to .codex/templates/{id}.json", async () => {
    await repo.saveTemplate(asHandle(vault), {
      version: 1,
      id: "u1",
      name: "Mine",
      entityType: "character",
      markdown: "## A\n",
    });
    expect(
      JSON.parse(vault.read([".codex", "templates", "u1.json"])!).name,
    ).toBe("Mine");
  });

  it("saves defaults to defaults.json", async () => {
    await repo.saveDefaults(asHandle(vault), {
      version: 1,
      defaults: { character: "u1" },
    });
    expect(vault.read([".codex", "templates", "defaults.json"])).toContain(
      "u1",
    );
  });

  it("deletes only the named template", async () => {
    vault.put([".codex", "templates", "u1.json"], stored());
    vault.put([".codex", "templates", "u2.json"], stored({ id: "u2" }));
    await repo.deleteTemplate(asHandle(vault), "u1");
    expect(vault.read([".codex", "templates", "u1.json"])).toBeUndefined();
    expect(vault.read([".codex", "templates", "u2.json"])).toBeDefined();
  });

  it("loads user templates and defaults", async () => {
    vault.put([".codex", "templates", "u1.json"], stored());
    vault.put(
      [".codex", "templates", "defaults.json"],
      JSON.stringify({ version: 1, defaults: { character: "u1" } }),
    );
    const r = await repo.loadAll({ vault: asHandle(vault) });
    expect(r.templates.map((t) => t.id)).toEqual(["u1"]);
    expect(r.defaults.defaults.character).toBe("u1");
    expect(r.warnings).toEqual([]);
  });

  it("returns empty results when nothing exists", async () => {
    const r = await repo.loadAll({ vault: asHandle(vault) });
    expect(r.templates).toEqual([]);
    expect(r.legacy).toEqual([]);
    expect(r.defaults.defaults).toEqual({});
  });

  it("skips malformed files with a warning and still loads the rest", async () => {
    vault.put([".codex", "templates", "bad.json"], "{not json");
    vault.put([".codex", "templates", "wrong.json"], JSON.stringify({ id: 3 }));
    vault.put(
      [".codex", "templates", "newer.json"],
      stored({ id: "n", version: 9 }),
    );
    vault.put([".codex", "templates", "u1.json"], stored());
    const r = await repo.loadAll({ vault: asHandle(vault) });
    expect(r.templates.map((t) => t.id)).toEqual(["u1"]);
    expect(r.warnings).toHaveLength(3);
  });

  it("skips a file whose id does not match its name, so it can never overwrite another file", async () => {
    vault.put(
      [".codex", "templates", "other.json"],
      stored({ id: "defaults" }),
    );
    vault.put(
      [".codex", "templates", "sneaky.json"],
      stored({ id: "../escape" }),
    );
    const r = await repo.loadAll({ vault: asHandle(vault) });
    expect(r.templates).toEqual([]);
    expect(r.warnings).toHaveLength(2);
  });

  it("ignores a malformed defaults file", async () => {
    vault.put([".codex", "templates", "defaults.json"], "nope");
    const r = await repo.loadAll({ vault: asHandle(vault) });
    expect(r.defaults.defaults).toEqual({});
    expect(r.warnings).toHaveLength(1);
  });

  describe("legacy files", () => {
    it("reads {type}.md from .cc/templates and .codex/templates case-insensitively", async () => {
      vault.put([".cc", "templates", "Character.MD"], "CC");
      vault.put([".codex", "templates", "location.md"], "CODEX");
      const r = await repo.loadAll({ vault: asHandle(vault) });
      expect(r.legacy).toEqual([
        { type: "character", markdown: "CC" },
        { type: "location", markdown: "CODEX" },
      ]);
    });

    it("treats an empty file as a valid blank template", async () => {
      vault.put([".cc", "templates", "character.md"], "");
      const r = await repo.loadAll({ vault: asHandle(vault) });
      expect(r.legacy).toEqual([{ type: "character", markdown: "" }]);
    });

    it(".cc/templates wins over .codex/templates for the same type", async () => {
      vault.put([".cc", "templates", "character.md"], "CC");
      vault.put([".codex", "templates", "character.md"], "CODEX");
      const r = await repo.loadAll({ vault: asHandle(vault) });
      expect(r.legacy).toEqual([{ type: "character", markdown: "CC" }]);
    });

    it("uses the linked folder when present and never merges with the vault directory", async () => {
      const folder = new FakeDir("folder");
      folder.put([".cc", "templates", "character.md"], "FOLDER");
      vault.put([".cc", "templates", "character.md"], "VAULT");
      vault.put([".cc", "templates", "location.md"], "VAULT-LOC");
      const r = await repo.loadAll({
        vault: asHandle(vault),
        folder: asHandle(folder),
      });
      expect(r.legacy).toEqual([{ type: "character", markdown: "FOLDER" }]);
    });

    it("does not treat {id}.json or defaults.json as legacy", async () => {
      vault.put([".codex", "templates", "u1.json"], stored());
      const r = await repo.loadAll({ vault: asHandle(vault) });
      expect(r.legacy).toEqual([]);
    });
  });
});
