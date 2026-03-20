import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultAIClientManager } from "./client-manager";
import { GoogleGenerativeAI } from "@google/generative-ai";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({}),
    })),
  };
});

describe("DefaultAIClientManager", () => {
  let manager: DefaultAIClientManager;

  beforeEach(() => {
    manager = new DefaultAIClientManager();
    vi.clearAllMocks();
  });

  it("should create a new client when getClient is called for the first time", () => {
    const client = manager.getClient("key1");
    expect(GoogleGenerativeAI).toHaveBeenCalledWith("key1");
    expect(client).toBeDefined();
  });

  it("should reuse the client when called with the same API key", () => {
    const client1 = manager.getClient("key1");
    const client2 = manager.getClient("key1");
    expect(GoogleGenerativeAI).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("should create a new client when the API key changes", () => {
    const client1 = manager.getClient("key1");
    const client2 = manager.getClient("key2");
    expect(GoogleGenerativeAI).toHaveBeenCalledTimes(2);
    expect(GoogleGenerativeAI).toHaveBeenLastCalledWith("key2");
    expect(client1).not.toBe(client2);
  });

  it("should create a model with correct parameters", () => {
    const model = manager.getModel("key1", "gemini-pro", "instruction");
    
    // Get the mocked client instance
    const client = manager.getClient("key1");
    expect(client.getGenerativeModel).toHaveBeenCalledWith({
      model: "gemini-pro",
      systemInstruction: "instruction",
    });
    expect(model).toBeDefined();
  });
});
