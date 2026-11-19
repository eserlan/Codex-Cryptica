import { describe, expect, it, vi } from "vitest";
import { EntityEditingRegistry } from "./entity-editing-registry";

describe("EntityEditingRegistry", () => {
  it("tracks an id until every editor of it has released", () => {
    const registry = new EntityEditingRegistry();
    const first = registry.begin("a");
    const second = registry.begin("a");
    first();
    expect(registry.isEditing("a")).toBe(true);
    second();
    expect(registry.isEditing("a")).toBe(false);
  });

  it("notifies only when the last id is released, and once per release", () => {
    const registry = new EntityEditingRegistry();
    const listener = vi.fn();
    registry.onAllReleased(listener);
    const a = registry.begin("a");
    const b = registry.begin("b");
    a();
    a();
    expect(listener).not.toHaveBeenCalled();
    b();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const registry = new EntityEditingRegistry();
    const listener = vi.fn();
    registry.onAllReleased(listener)();
    registry.begin("a")();
    expect(listener).not.toHaveBeenCalled();
  });
});
