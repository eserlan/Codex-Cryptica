import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdventureFocusToolsState } from "./adventure-focus-tools.svelte.js";

afterEach(() => document.body.replaceChildren());

function setup() {
  const repository = { list: vi.fn().mockResolvedValue({ entries: [] }) };
  return { repository, tools: new AdventureFocusToolsState(() => repository) };
}

describe("AdventureFocusToolsState", () => {
  it("shares the pending listing between archive and management for the same vault", async () => {
    const { repository, tools } = setup();
    const first = tools.list("vault-1");
    expect(tools.list("vault-1")).toBe(first);
    expect(repository.list).toHaveBeenCalledOnce();
    await expect(first).resolves.toEqual({ entries: [] });
  });

  it("refreshes the listing on request, invalidation, a vault change or sheet close", () => {
    const { repository, tools } = setup();
    tools.list("vault-1");
    tools.list("vault-1", true);
    tools.invalidate();
    tools.list("vault-1");
    tools.list("vault-2");
    tools.close();
    tools.list("vault-2");
    expect(repository.list.mock.calls.map(([id]) => id)).toEqual([
      "vault-1",
      "vault-1",
      "vault-1",
      "vault-2",
      "vault-2",
    ]);
  });

  it("propagates listing failures and permits retry after invalidation", async () => {
    const { repository, tools } = setup();
    repository.list.mockRejectedValueOnce(new Error("unavailable"));
    await expect(tools.list("vault-1")).rejects.toThrow("unavailable");
    tools.invalidate();
    await expect(tools.list("vault-1")).resolves.toEqual({ entries: [] });
  });

  it("moves focus into the sheet after opening and back to its trigger on close", async () => {
    const { tools } = setup();
    const trigger = document.createElement("button");
    const close = document.createElement("button");
    document.body.append(trigger, close);
    tools.button = trigger;
    tools.closeButton = close;
    tools.toggle();
    expect(tools.open).toBe(true);
    await tick();
    expect(document.activeElement).toBe(close);
    tools.toggle();
    expect(tools.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("lets Escape close the sheet only after nested dialogs have handled it", () => {
    const { tools } = setup();
    tools.open = true;
    const nested = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    tools.handleKeydown(nested, true);
    expect(tools.open).toBe(true);
    expect(nested.defaultPrevented).toBe(false);
    const handled = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    handled.preventDefault();
    tools.handleKeydown(handled, false);
    expect(tools.open).toBe(true);
    tools.handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }), false);
    expect(tools.open).toBe(true);
    tools.handleKeydown(nested, false);
    expect(tools.open).toBe(false);
    expect(nested.defaultPrevented).toBe(true);
  });
});
