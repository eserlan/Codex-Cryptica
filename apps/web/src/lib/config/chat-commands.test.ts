import { describe, it, expect, vi } from "vitest";
import { chatCommands } from "./chat-commands";

// Mock the oracle store
vi.mock("../stores/oracle.svelte", () => ({
  oracle: {
    ask: vi.fn(),
    startWizard: vi.fn(),
  },
}));

import { oracle } from "../stores/oracle.svelte";

describe("chatCommands", () => {
  it("should have default commands registered", () => {
    const names = chatCommands.map((c) => c.name);
    expect(names).toContain("/draw");
    expect(names).toContain("/create");
    expect(names).toContain("/plot");
    expect(names).toContain("/connect");
  });

  it("should trigger oracle.ask for /draw", () => {
    const draw = chatCommands.find((c) => c.name === "/draw");
    draw?.handler("a blue dragon");
    expect(oracle.ask).toHaveBeenCalledWith("/draw a blue dragon");
  });

  it("should trigger oracle.ask for /plot", () => {
    const plot = chatCommands.find((c) => c.name === "/plot");
    plot?.handler("Eldrin the Wise");
    expect(oracle.ask).toHaveBeenCalledWith("/plot Eldrin the Wise");
  });

  it("should trigger oracle.ask for /create", () => {
    const create = chatCommands.find((c) => c.name === "/create");
    create?.handler("a mysterious tavern");
    expect(oracle.ask).toHaveBeenCalledWith("/create a mysterious tavern");
  });

  it("should trigger oracle.startWizard for /connect oracle", () => {
    const connect = chatCommands.find((c) => c.name === "/connect");
    connect?.handler("oracle");
    expect(oracle.startWizard).toHaveBeenCalledWith("connection");
  });

  it("should trigger oracle.ask for /connect with direct arguments", () => {
    const connect = chatCommands.find((c) => c.name === "/connect");
    connect?.handler("Eldrin is the master of The Tower");
    expect(oracle.ask).toHaveBeenCalledWith(
      "/connect Eldrin is the master of The Tower",
    );
  });
});
