import { describe, it, expect, vi, beforeEach } from "vitest";
import { oracle } from "./oracle.svelte";
import * as idbUtils from "../utils/idb";

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = vi.fn();
  close = vi.fn();
}
global.BroadcastChannel = MockBroadcastChannel as any;

// Mock dependencies
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("../services/ai", () => ({
  aiService: {
    generateResponse: vi.fn(),
    retrieveContext: vi.fn(),
  },
}));

describe("OracleStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oracle.messages = [];
    oracle.apiKey = null;
    oracle.isOpen = false;
    oracle.isLoading = false;
  });

  it("should initialize with empty state", () => {
    expect(oracle.messages).toHaveLength(0);
    expect(oracle.isEnabled).toBe(false);
  });

  it("should load API key from database on init", async () => {
    const mockDB = await idbUtils.getDB();
    vi.mocked(mockDB.get).mockResolvedValue("test-api-key");

    await oracle.init();

    expect(mockDB.get).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(oracle.apiKey).toBe("test-api-key");
    expect(oracle.isEnabled).toBe(true);
  });

  it("should save API key to database", async () => {
    const mockDB = await idbUtils.getDB();
    
    await oracle.setKey("new-key");

    expect(mockDB.put).toHaveBeenCalledWith("settings", "new-key", "ai_api_key");
    expect(oracle.apiKey).toBe("new-key");
  });

  it("should clear API key and messages", async () => {
    const mockDB = await idbUtils.getDB();
    oracle.apiKey = "some-key";
    oracle.messages = [{ role: "user", content: "hello" }];

    await oracle.clearKey();

    expect(mockDB.delete).toHaveBeenCalledWith("settings", "ai_api_key");
    expect(oracle.apiKey).toBe(null);
    expect(oracle.messages).toHaveLength(0);
  });

  it("should toggle open state", () => {
    expect(oracle.isOpen).toBe(false);
    oracle.toggle();
    expect(oracle.isOpen).toBe(true);
    oracle.toggle();
    expect(oracle.isOpen).toBe(false);
  });
});
