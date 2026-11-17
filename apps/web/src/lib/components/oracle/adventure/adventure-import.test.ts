import { describe, expect, it, vi } from "vitest";
import type { AdventureJsonV1 } from "@codex/adventure-engine";
import sample from "../../../../../static/schemas/adventure-json/examples/minimal.v1.json";
import { AdventureImportController } from "./adventure-import.svelte.js";

const approved = sample as AdventureJsonV1;
const jsonFile = (text = JSON.stringify(sample)) =>
  new File([text], "adventure.json", { type: "application/json" });

function setup() {
  const env = { vaultId: "vault-1", guest: false, ready: true };
  const deps = {
    getVaultId: () => env.vaultId,
    canImport: () => env.ready,
    isGuest: () => env.guest,
    saveApproved: vi.fn(async (_id: string, pkg: AdventureJsonV1) => ({
      package: pkg,
    })),
    notify: vi.fn(),
    onReview: vi.fn(),
    onCancel: vi.fn(),
    onApproved: vi.fn(),
  };
  return { env, deps, imports: new AdventureImportController(deps) };
}

describe("adventure import controller", () => {
  it("reviews valid JSON without saving it and explicitly approves it in the originating Vault", async () => {
    const { imports, deps } = setup();
    await imports.importJson(jsonFile());
    expect(imports.draft?.title).toBe(sample.title);
    expect(imports.experimentalOrigin).toBeNull();
    expect(deps.onReview).toHaveBeenCalledOnce();
    expect(deps.saveApproved).not.toHaveBeenCalled();
    await imports.approve(approved);
    expect(deps.saveApproved).toHaveBeenCalledWith("vault-1", approved);
    expect(deps.notify).toHaveBeenCalledWith(
      `Approved "${sample.title}" for local play.`,
    );
    expect(deps.onApproved).toHaveBeenCalledWith("vault-1");
    expect(imports.approving).toBe(false);
  });

  it.each([
    ["{", "Adventure JSON could not be parsed.", "INVALID_JSON"],
    ["{}", "Adventure JSON validation failed.", undefined],
  ])(
    "reports invalid JSON input %s without entering review",
    async (text, error, code) => {
      const { imports, deps } = setup();
      await imports.importJson(jsonFile(text));
      expect(imports.error).toBe(error);
      expect(imports.validationErrors.length).toBeGreaterThan(0);
      if (code) expect(imports.validationErrors[0].code).toBe(code);
      expect(deps.onReview).not.toHaveBeenCalled();
      expect(imports.inFlight).toBe(false);
    },
  );

  it.each([
    ["file.txt", "text/plain", 1, "Adventure JSON"],
    ["file.json", "application/json", 10 * 1024 * 1024 + 1, "10 MiB"],
  ])("rejects %s before reading bytes", async (name, type, size, message) => {
    const { imports } = setup();
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    const read = vi.spyOn(file, "arrayBuffer");
    await imports.importJson(file);
    expect(imports.error).toContain(message);
    expect(read).not.toHaveBeenCalled();
  });

  it.each(["guest", "not-ready"])(
    "rejects imports in a %s Vault",
    async (mode) => {
      const { env, imports } = setup();
      env.guest = mode === "guest";
      env.ready = mode !== "not-ready";
      const file = jsonFile();
      const read = vi.spyOn(file, "arrayBuffer");
      await imports.importJson(file);
      expect(imports.error).toContain("owner Vault");
      expect(read).not.toHaveBeenCalled();
    },
  );

  it("normalises experimental Markdown into a review draft", async () => {
    const { imports, deps } = setup();
    await imports.importExperimental(
      new File(["# The Mill\n\n## Scene 1\nThe wheel stops."], "mill.md"),
    );
    expect(imports.draft?.title).toBe("The Mill");
    expect(imports.experimentalOrigin).toBe("markdown");
    expect(deps.onReview).toHaveBeenCalledOnce();
  });

  it("keeps the newer draft when an earlier file finishes reading", async () => {
    const { imports } = setup();
    let finish!: (value: ArrayBuffer) => void;
    const earlier = jsonFile();
    vi.spyOn(earlier, "arrayBuffer").mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const reading = imports.importJson(earlier);
    const newer = { ...sample, title: "The New Adventure" };
    await imports.importJson(jsonFile(JSON.stringify(newer)));
    finish(new TextEncoder().encode(JSON.stringify(sample)).buffer);
    await reading;
    expect(imports.draft?.title).toBe("The New Adventure");
    expect(imports.inFlight).toBe(false);
  });

  it("ignores a file read from a Vault that is no longer active", async () => {
    const { env, imports, deps } = setup();
    const file = jsonFile();
    vi.spyOn(file, "arrayBuffer").mockImplementation(async () => {
      env.vaultId = "vault-2";
      return new TextEncoder().encode(JSON.stringify(sample)).buffer;
    });
    await imports.importJson(file);
    expect(imports.draft).toBeNull();
    expect(deps.onReview).not.toHaveBeenCalled();
  });

  it("reports read errors and save failures without losing the reviewed draft", async () => {
    const { imports, deps } = setup();
    const file = jsonFile();
    vi.spyOn(file, "arrayBuffer").mockRejectedValue(new Error("read failed"));
    await imports.importJson(file);
    expect(imports.error).toBe("read failed");
    await imports.importJson(jsonFile());
    deps.saveApproved.mockRejectedValueOnce(new Error("disk full"));
    await expect(imports.approve(approved)).rejects.toThrow("disk full");
    expect(imports.approveError).toBe("disk full");
    expect(imports.draft?.title).toBe(sample.title);
    expect(imports.approving).toBe(false);
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("refuses approval after switching Vaults", async () => {
    const { env, imports, deps } = setup();
    await imports.importJson(jsonFile());
    env.vaultId = "vault-2";
    await expect(imports.approve(approved)).rejects.toThrow(
      "Return to the owner Vault",
    );
    expect(deps.saveApproved).not.toHaveBeenCalled();
  });

  it("invalidates an in-flight approval when the draft is reset", async () => {
    const { imports, deps } = setup();
    await imports.importJson(jsonFile());
    let finish!: (value: { package: AdventureJsonV1 }) => void;
    deps.saveApproved.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const saving = imports.approve(approved);
    expect(imports.approving).toBe(true);
    imports.reset();
    finish({ package: approved });
    await saving;
    expect(imports.draft).toBeNull();
    expect(imports.approving).toBe(false);
    expect(deps.onApproved).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("cancels review and clears validation and draft state", async () => {
    const { imports, deps } = setup();
    await imports.importJson(jsonFile());
    imports.cancel();
    expect(imports.draft).toBeNull();
    expect(imports.error).toBeNull();
    expect(imports.validationErrors).toEqual([]);
    expect(deps.onCancel).toHaveBeenCalledOnce();
    await expect(imports.approve(approved)).rejects.toThrow("owner Vault");
  });
});
