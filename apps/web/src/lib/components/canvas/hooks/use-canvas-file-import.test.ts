/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";
import {
  useCanvasFileImport,
  formatFileFailure,
  centerScreenPosition,
} from "./use-canvas-file-import.svelte";

function makeDeps(overrides: Partial<Parameters<typeof useCanvasFileImport>[0]> = {}) {
  const nodes: Node[] = [];
  return {
    vault: {
      isGuest: false,
      importFileToVault: vi.fn(async (file: File) => ({
        ok: true as const,
        file: { path: `/files/${file.name}`, name: file.name, mimeType: file.type, size: file.size },
      })),
    },
    engine: { addFileNode: vi.fn(() => "node-1") },
    logic: {
      nodes,
      screenToFlowPosition: vi.fn((p) => p),
      saveNow: vi.fn(),
    },
    isEditableTarget: vi.fn(() => false),
    notify: vi.fn(),
    setNodes: vi.fn((updater: (nodes: Node[]) => Node[]) => {
      nodes.splice(0, nodes.length, ...updater(nodes));
    }),
    ...overrides,
  };
}

describe("formatFileFailure", () => {
  it("describes a known failure reason", () => {
    const file = new File(["a"], "notes.txt");
    expect(formatFileFailure(file, "too_large")).toBe(
      "notes.txt is larger than 10 MB.",
    );
  });
});

describe("centerScreenPosition", () => {
  it("returns the center of the window", () => {
    expect(centerScreenPosition()).toEqual({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  });
});

describe("useCanvasFileImport", () => {
  it("imports files, adds nodes, and notifies success", async () => {
    const deps = makeDeps();
    const fileImport = useCanvasFileImport(deps);
    const file = new File(["a"], "map.png", { type: "image/png" });

    await fileImport.handleExternalFiles([file], { x: 10, y: 10 });

    expect(deps.vault.importFileToVault).toHaveBeenCalledWith(file);
    expect(deps.engine.addFileNode).toHaveBeenCalled();
    expect(deps.logic.saveNow).toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith(
      expect.stringContaining("added to the vault and canvas"),
      "success",
    );
    expect(deps.logic.nodes).toHaveLength(1);
  });

  it("does nothing for guests and reports failures without adding nodes", async () => {
    const guestDeps = makeDeps({ vault: { isGuest: true, importFileToVault: vi.fn() } });
    const guestImport = useCanvasFileImport(guestDeps);
    await guestImport.handleExternalFiles([new File(["a"], "a.png")]);
    expect(guestDeps.vault.importFileToVault).not.toHaveBeenCalled();

    const failingDeps = makeDeps({
      vault: {
        isGuest: false,
        importFileToVault: vi.fn(async () => ({
          ok: false as const,
          reason: "too_large" as const,
        })),
      },
    });
    const failingImport = useCanvasFileImport(failingDeps);
    await failingImport.handleExternalFiles([new File(["a"], "big.png")]);

    expect(failingDeps.engine.addFileNode).not.toHaveBeenCalled();
    expect(failingDeps.notify).toHaveBeenCalledWith(
      expect.stringContaining("is larger than 10 MB"),
      "error",
    );
    expect(failingDeps.logic.nodes).toHaveLength(0);
  });
});
