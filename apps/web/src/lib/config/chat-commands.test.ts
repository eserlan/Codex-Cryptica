import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCommands } from "./chat-commands";
import { oracle } from "../stores/oracle.svelte";

// Mock the oracle store
vi.mock("../stores/oracle.svelte", () => ({
  oracle: {
    ask: vi.fn(),
    startWizard: vi.fn(),
    clearMessages: vi.fn(),
  },
}));

describe("chatCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have the correct number of commands", () => {
    expect(chatCommands).toHaveLength(8);
  });

  it("/roll should call oracle.ask", () => {
    const cmd = chatCommands.find((c) => c.name === "/roll");
    cmd?.handler("2d20");
    expect(oracle.ask).toHaveBeenCalledWith("/roll 2d20");
  });

  it("/draw should call oracle.ask", () => {
    const cmd = chatCommands.find((c) => c.name === "/draw");
    cmd?.handler("a dragon");
    expect(oracle.ask).toHaveBeenCalledWith("/draw a dragon");
  });

  it("/create should call oracle.ask", () => {
    const cmd = chatCommands.find((c) => c.name === "/create");
    cmd?.handler("a sword");
    expect(oracle.ask).toHaveBeenCalledWith("/create a sword");
  });

  describe("/connect", () => {
    it("should start connection wizard if arg is 'oracle'", () => {
      const cmd = chatCommands.find((c) => c.name === "/connect");
      cmd?.handler("oracle");
      expect(oracle.startWizard).toHaveBeenCalledWith("connection");
      expect(oracle.ask).not.toHaveBeenCalled();
    });

    it("should call oracle.ask for other args", () => {
      const cmd = chatCommands.find((c) => c.name === "/connect");
      cmd?.handler("A with B");
      expect(oracle.ask).toHaveBeenCalledWith("/connect A with B");
      expect(oracle.startWizard).not.toHaveBeenCalled();
    });
  });

  describe("/merge", () => {
    it("should start merge wizard if arg is 'oracle'", () => {
      const cmd = chatCommands.find((c) => c.name === "/merge");
      cmd?.handler("oracle");
      expect(oracle.startWizard).toHaveBeenCalledWith("merge");
      expect(oracle.ask).not.toHaveBeenCalled();
    });

    it("should call oracle.ask for other args", () => {
      const cmd = chatCommands.find((c) => c.name === "/merge");
      cmd?.handler("A into B");
      expect(oracle.ask).toHaveBeenCalledWith("/merge A into B");
      expect(oracle.startWizard).not.toHaveBeenCalled();
    });
  });

  it("/plot should call oracle.ask", () => {
    const cmd = chatCommands.find((c) => c.name === "/plot");
    cmd?.handler("Guts");
    expect(oracle.ask).toHaveBeenCalledWith("/plot Guts");
  });

  it("/help should call oracle.ask", () => {
    const cmd = chatCommands.find((c) => c.name === "/help");
    cmd?.handler("");
    expect(oracle.ask).toHaveBeenCalledWith("/help");
  });

  describe("/clear", () => {
    it("should clear messages if confirmed", () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
      const cmd = chatCommands.find((c) => c.name === "/clear");
      cmd?.handler("");
      expect(oracle.clearMessages).toHaveBeenCalled();
    });

    it("should NOT clear messages if cancelled", () => {
      vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
      const cmd = chatCommands.find((c) => c.name === "/clear");
      cmd?.handler("");
      expect(oracle.clearMessages).not.toHaveBeenCalled();
    });
  });
});
