import { describe, expect, it } from "vitest";

(global as any).$state = (value: any) => value;

import { LayoutUIStore } from "./layout-ui.svelte";
import { focusEntity } from "./navigation";
import { UIPersistence } from "./persistence";

describe("focusEntity", () => {
  it("focuses an entity, closes mobile sidebar, and clears vault selection", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: "e1" };
    layout.isMobile = true;
    layout.leftSidebarOpen = true;
    layout.activeSidebarTool = "explorer";

    focusEntity(layout, "e2", vault);

    expect(layout.mainViewMode).toBe("focus");
    expect(layout.focusedEntityId).toBe("e2");
    expect(layout.leftSidebarOpen).toBe(false);
    expect(layout.activeSidebarTool).toBe("none");
    expect(vault.selectedEntityId).toBeNull();
  });

  it("returns from focus mode and selects the previously focused entity", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: null as string | null };
    layout.mainViewMode = "focus";
    layout.focusedEntityId = "e2";

    focusEntity(layout, null, vault);

    expect(layout.mainViewMode).toBe("visualization");
    expect(layout.focusedEntityId).toBeNull();
    expect(vault.selectedEntityId).toBe("e2");
  });

  it("does nothing when clearing focus outside focus mode", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: null as string | null };

    focusEntity(layout, null, vault);

    expect(layout.mainViewMode).toBe("visualization");
    expect(vault.selectedEntityId).toBeNull();
  });
});
