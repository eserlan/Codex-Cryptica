import { describe, it, expect, vi, beforeEach } from "vitest";
import * as adapters from "./adapters.svelte";
import * as opfs from "../../utils/opfs";
import * as markdown from "../../utils/markdown";
import { cacheService } from "../../services/cache.svelte";
import { uiStore } from "../ui.svelte";
import * as imageProcessing from "../../utils/image-processing";
import { getDB } from "../../utils/idb";
import { LocalSyncService, SyncRegistry } from "@codex/sync-engine";

vi.mock("../../utils/opfs", () => ({
  walkOpfsDirectory: vi.fn(),
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
  isNotFoundError: vi.fn(),
  readOpfsBlob: vi.fn(),
  getDirHandle: vi.fn(),
}));

vi.mock("../../utils/markdown", () => ({
  parseMarkdown: vi.fn(),
  stringifyEntity: vi.fn(),
  deriveIdFromPath: vi.fn(),
}));

vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("../ui.svelte", () => ({
  uiStore: {
    notify: vi.fn(),
  },
}));

vi.mock("../../utils/image-processing", () => ({
  convertToWebP: vi.fn(),
  generateThumbnail: vi.fn(),
}));

vi.mock("../../utils/idb", () => ({
  getDB: vi.fn(),
}));

vi.mock("@codex/sync-engine", () => {
  const LocalSyncService = vi.fn();
  const SyncRegistry = vi.fn();
  return { LocalSyncService, SyncRegistry };
});

// Mock Svelte 5 $state
vi.stubGlobal("$state", {
  snapshot: vi.fn((x) => x),
});

describe("Adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fileIOAdapter", () => {
    it("should walk directory", async () => {
      const mockDir = {} as any;
      const callback = vi.fn();
      await adapters.fileIOAdapter.walkDirectory(mockDir, callback);
      expect(opfs.walkOpfsDirectory).toHaveBeenCalledWith(mockDir, callback);
    });

    it("should read file as text", async () => {
      const mockFile = {
        text: vi.fn().mockResolvedValue("content"),
      };
      const mockEntry = {
        handle: {
          getFile: vi.fn().mockResolvedValue(mockFile),
        },
      } as any;
      const content = await adapters.fileIOAdapter.readFileAsText(mockEntry);
      expect(content).toBe("content");
      expect(mockEntry.handle.getFile).toHaveBeenCalled();
    });

    it("should write entity file", async () => {
      const mockDir = {} as any;
      const mockEntity = { id: "e1", _path: ["e1.md"] };
      vi.mocked(markdown.stringifyEntity).mockReturnValue("mock-yaml");

      await adapters.fileIOAdapter.writeEntityFile(
        mockDir,
        "v1",
        mockEntity as any,
      );

      expect(markdown.stringifyEntity).toHaveBeenCalled();
      expect(opfs.writeOpfsFile).toHaveBeenCalledWith(
        ["e1.md"],
        "mock-yaml",
        mockDir,
        "v1",
      );
    });

    it("should write entity file with default path if _path missing", async () => {
      const mockDir = {} as any;
      const mockEntity = { id: "e1" };
      vi.mocked(markdown.stringifyEntity).mockReturnValue("mock-yaml");

      await adapters.fileIOAdapter.writeEntityFile(
        mockDir,
        "v1",
        mockEntity as any,
      );

      expect(opfs.writeOpfsFile).toHaveBeenCalledWith(
        ["e1.md"],
        "mock-yaml",
        mockDir,
        "v1",
      );
    });

    it("should get cached entity", async () => {
      vi.mocked(cacheService.get).mockResolvedValue({ id: "e1" });
      const entity = await adapters.fileIOAdapter.getCachedEntity("v1", "path");
      expect(entity).toEqual({ id: "e1" });
      expect(cacheService.get).toHaveBeenCalledWith("v1:path");
    });

    it("should set cached entity", async () => {
      await adapters.fileIOAdapter.setCachedEntity("v1", "path", 123, {
        id: "e1",
      } as any);
      expect(cacheService.set).toHaveBeenCalledWith("v1:path", 123, {
        id: "e1",
      });
    });

    it("should parse markdown with all fields", () => {
      vi.mocked(markdown.parseMarkdown).mockReturnValue({
        metadata: {
          id: "e1",
          type: "person",
          title: "The King",
          tags: ["royal"],
          labels: ["important"],
          connections: ["e2"],
          lore: "Long ago...",
        },
        content: "hello",
      } as any);
      const entity = adapters.fileIOAdapter.parseMarkdown("text", ["path"]);
      expect(entity.id).toBe("e1");
      expect(entity.type).toBe("person");
      expect(entity.title).toBe("The King");
      expect(entity.tags).toEqual(["royal"]);
      expect(entity.labels).toEqual(["important"]);
      expect(entity.connections).toEqual(["e2"]);
      expect(entity.content).toBe("hello");
      expect(entity.lore).toBe("Long ago...");
      expect(entity._path).toEqual(["path"]);
    });

    it("should handle missing metadata in parseMarkdown and use defaults", () => {
      vi.mocked(markdown.parseMarkdown).mockReturnValue({
        metadata: {},
        content: "hello",
      } as any);
      vi.mocked(markdown.deriveIdFromPath).mockReturnValue("derived-id");
      const entity = adapters.fileIOAdapter.parseMarkdown("text", ["path"]);
      expect(entity.id).toBe("derived-id");
      expect(entity.title).toBe("derived-id");
      expect(entity.type).toBe("note"); // DEFAULT_ENTITY_TYPE is "note"
      expect(entity.tags).toEqual([]);
      expect(entity.labels).toEqual([]);
      expect(entity.connections).toEqual([]);
      expect(entity.lore).toBe("");
      expect(entity._path).toEqual(["path"]);
    });

    it("should check isNotFoundError", () => {
      const err = new Error();
      adapters.fileIOAdapter.isNotFoundError(err);
      expect(opfs.isNotFoundError).toHaveBeenCalledWith(err);
    });
  });

  describe("syncIOAdapter", () => {
    it("should handle walkDirectory and other OPFS calls", async () => {
      const mockDir = {} as any;
      const callback = vi.fn();
      await adapters.syncIOAdapter.walkDirectory(mockDir, callback);
      expect(opfs.walkOpfsDirectory).toHaveBeenCalledWith(mockDir, callback);

      await adapters.syncIOAdapter.deleteOpfsEntry(["path"], mockDir, "v1");
      expect(opfs.deleteOpfsEntry).toHaveBeenCalled();

      await adapters.syncIOAdapter.writeOpfsFile(
        ["path"],
        "content",
        mockDir,
        "v1",
      );
      expect(opfs.writeOpfsFile).toHaveBeenCalled();

      await adapters.syncIOAdapter.readOpfsBlob(["path"], mockDir, "v1");
      expect(opfs.readOpfsBlob).toHaveBeenCalled();

      await adapters.syncIOAdapter.getDirectoryHandle(mockDir, ["path"], true);
      expect(opfs.getDirHandle).toHaveBeenCalled();

      adapters.syncIOAdapter.isNotFoundError(new Error());
      expect(opfs.isNotFoundError).toHaveBeenCalled();
    });

    it("should handle local handle operations", async () => {
      const mockDB = {
        get: vi.fn().mockResolvedValue("handle"),
        put: vi.fn(),
        delete: vi.fn(),
      };
      vi.mocked(getDB).mockResolvedValue(mockDB as any);

      const handle = await adapters.syncIOAdapter.getLocalHandle("v1");
      expect(handle).toBe("handle");
      expect(mockDB.get).toHaveBeenCalledWith("settings", "syncHandle_v1");

      await adapters.syncIOAdapter.setLocalHandle("v1", "new-handle" as any);
      expect(mockDB.put).toHaveBeenCalledWith(
        "settings",
        "new-handle",
        "syncHandle_v1",
      );

      await adapters.syncIOAdapter.deleteLocalHandle("v1");
      expect(mockDB.delete).toHaveBeenCalledWith("settings", "syncHandle_v1");
    });

    it("should parse markdown", () => {
      vi.mocked(markdown.parseMarkdown).mockReturnValue({
        metadata: {},
        content: "",
      } as any);
      adapters.syncIOAdapter.parseMarkdown("text");
      expect(markdown.parseMarkdown).toHaveBeenCalledWith("text");
    });

    it("should show directory picker", async () => {
      const mockPicker = vi.fn().mockResolvedValue("handle");
      vi.stubGlobal("window", {
        showDirectoryPicker: mockPicker,
      });
      const handle = await adapters.syncIOAdapter.showDirectoryPicker();
      expect(handle).toBe("handle");
      expect(mockPicker).toHaveBeenCalledWith({ mode: "readwrite" });
      vi.unstubAllGlobals();
    });
  });

  describe("syncNotifier", () => {
    it("should notify", () => {
      adapters.syncNotifier.notify("msg", "success");
      expect(uiStore.notify).toHaveBeenCalledWith("msg", "success");

      adapters.syncNotifier.notify("msg", "warning");
      expect(uiStore.notify).toHaveBeenCalledWith("msg", "info");
    });

    it("should alert", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      adapters.syncNotifier.alert("msg");
      expect(alertSpy).toHaveBeenCalledWith("msg");
      alertSpy.mockRestore();
    });
  });

  describe("assetIOAdapter", () => {
    it("should wrap OPFS calls", async () => {
      const mockDir = {} as any;
      await adapters.assetIOAdapter.writeOpfsFile(["p"], "c", mockDir, "v1");
      expect(opfs.writeOpfsFile).toHaveBeenCalled();

      await adapters.assetIOAdapter.readOpfsBlob(["p"], mockDir, "v1");
      expect(opfs.readOpfsBlob).toHaveBeenCalled();

      await adapters.assetIOAdapter.getDirectoryHandle(mockDir, ["path"]);
      expect(opfs.getDirHandle).toHaveBeenCalled();

      adapters.assetIOAdapter.isNotFoundError(new Error());
      expect(opfs.isNotFoundError).toHaveBeenCalled();
    });
  });

  describe("imageProcessor", () => {
    it("should convert to WebP", async () => {
      await adapters.imageProcessor.convertToWebP({} as any);
      expect(imageProcessing.convertToWebP).toHaveBeenCalled();
    });

    it("should generate thumbnail", async () => {
      await adapters.imageProcessor.generateThumbnail({} as any, 100);
      expect(imageProcessing.generateThumbnail).toHaveBeenCalled();
    });
  });

  describe("createSyncEngine", () => {
    it("should create sync engine", async () => {
      vi.mocked(getDB).mockResolvedValue({} as any);
      const engine = await adapters.createSyncEngine();
      expect(LocalSyncService).toHaveBeenCalled();
      expect(SyncRegistry).toHaveBeenCalled();
      expect(engine).toBeInstanceOf(LocalSyncService);
    });
  });
});
