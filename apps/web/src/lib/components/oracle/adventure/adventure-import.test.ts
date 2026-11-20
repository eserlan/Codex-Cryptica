import { describe, expect, it, vi } from "vitest";
import {
  computeAdventureJsonHash,
  type AdventureJsonV1,
  type StoredAdventurePackage,
} from "@codex/adventure-engine";
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
    listApproved: vi.fn(async (): Promise<StoredAdventurePackage[]> => []),
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

  it("recognises identical imports and selects the prior version for changed content", async () => {
    const { imports, deps } = setup();
    const hash = await computeAdventureJsonHash(approved);
    const stored: StoredAdventurePackage = {
      hash,
      path: `.codex/adventures/packages/${hash}.json`,
      package: approved,
      originFormat: "adventure-json/v1",
    };
    deps.listApproved.mockResolvedValueOnce([stored]);
    await imports.importJson(jsonFile());
    expect(imports.duplicate).toEqual(stored);
    expect(deps.onReview).not.toHaveBeenCalled();

    const changed = { ...sample, version: "1.1.0" };
    deps.listApproved.mockResolvedValueOnce([stored]);
    await imports.importJson(jsonFile(JSON.stringify(changed)));
    expect(imports.duplicate).toBeNull();
    expect(imports.predecessor?.hash).toBe(hash);
    expect(deps.onReview).toHaveBeenCalledOnce();
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

  describe("Markdown JSON fences", () => {
    const pretty = JSON.stringify(sample, null, 2);
    const bytes = (text: string, bom = false) =>
      new File(
        [bom ? new Uint8Array([0xef, 0xbb, 0xbf]) : "", text],
        "adventure.json",
        { type: "application/json" },
      );

    it.each([
      ["plain", pretty],
      ["json fence", "```json\n" + pretty + "\n```\n"],
      ["unlabelled fence", "```\n" + pretty + "\n```"],
      ["JSON label", "```JSON\n" + pretty + "\n```"],
      ["CRLF", "```json\r\n" + pretty.replace(/\n/g, "\r\n") + "\r\n```\r\n"],
      ["blank lines", "\n\n  ```json\n" + pretty + "\n```\n\n"],
      [
        "raw JSON containing a fence in a string",
        JSON.stringify({ ...sample, title: "A ``` B" }),
      ],
    ])("imports %s", async (_name, text) => {
      const { imports, deps } = setup();
      await imports.importJson(jsonFile(text));
      expect(imports.error).toBeNull();
      expect(imports.draft?.title).toBe(
        _name.startsWith("raw") ? "A ``` B" : sample.title,
      );
      expect(deps.onReview).toHaveBeenCalledOnce();
    });

    it("produces the same draft from fenced and plain input", async () => {
      const plain = setup();
      await plain.imports.importJson(jsonFile(pretty));
      const fenced = setup();
      await fenced.imports.importJson(jsonFile("```json\n" + pretty + "\n```"));
      expect(fenced.imports.draft).toEqual(plain.imports.draft);
    });

    it.each([
      ["plain JSON", pretty],
      ["a fence", "```json\n" + pretty + "\n```"],
    ])("imports a UTF-8 BOM before %s", async (_name, text) => {
      const { imports, deps } = setup();
      await imports.importJson(bytes(text, true));
      expect(imports.draft?.title).toBe(sample.title);
      expect(deps.onReview).toHaveBeenCalledOnce();
    });

    it("rejects invalid UTF-8 without review", async () => {
      const { imports, deps } = setup();
      await imports.importJson(
        new File([new Uint8Array([0x7b, 0xff, 0xfe])], "a.json", {
          type: "application/json",
        }),
      );
      expect(imports.error).not.toBe("");
      expect(deps.onReview).not.toHaveBeenCalled();
    });

    it.each([
      ["prose before", "Here is your adventure:\n```json\n" + pretty + "\n```"],
      ["prose after", "```json\n" + pretty + "\n```\nEnjoy!"],
      ["two blocks", "```json\n" + pretty + "\n```\n\n```json\n{}\n```"],
      ["unclosed fence", "```json\n" + pretty],
      ["other label", "```javascript\n" + pretty + "\n```"],
      ["malformed JSON in fence", "```json\n{bad\n```"],
    ])("rejects %s", async (_name, text) => {
      const { imports, deps } = setup();
      await imports.importJson(jsonFile(text));
      expect(imports.error).toBe("Adventure JSON could not be parsed.");
      expect(imports.validationErrors[0].code).toBe("INVALID_JSON");
      expect(deps.onReview).not.toHaveBeenCalled();
      expect(deps.saveApproved).not.toHaveBeenCalled();
    });

    it("explains the accepted forms for prose around a fence", async () => {
      const { imports } = setup();
      await imports.importJson(jsonFile("Here:\n```json\n{}\n```"));
      expect(imports.validationErrors[0].message).toContain(
        "single fenced JSON block",
      );
    });

    it("treats a fenced copy of a stored plain document as a duplicate", async () => {
      const { imports, deps } = setup();
      const hash = await computeAdventureJsonHash(approved);
      const stored: StoredAdventurePackage = {
        hash,
        path: `.codex/adventures/packages/${hash}.json`,
        package: approved,
        originFormat: "adventure-json/v1",
      };
      deps.listApproved.mockResolvedValueOnce([stored]);
      await imports.importJson(jsonFile("```json\n" + pretty + "\n```"));
      expect(imports.duplicate).toEqual(stored);
      expect(deps.onReview).not.toHaveBeenCalled();
    });
  });

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
