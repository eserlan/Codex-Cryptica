import { describe, expect, it } from "vitest";

(global as any).$state = (value: any) => value;

import { LayoutUIStore } from "./layout-ui.svelte";
import { focusEntity } from "./navigation";
import { UIPersistence } from "./persistence";

describe("focusEntity — ownership rules", () => {
  it("clears vault selectedEntityId when focus mode takes over", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: "graph-selected" };

    focusEntity(layout, "e1", vault);

    expect(layout.mainViewMode).toBe("focus");
    expect(layout.focusedEntityId).toBe("e1");
    // graph-side selection must be cleared so both don't claim ownership
    expect(vault.selectedEntityId).toBeNull();
  });

  it("is a no-op when already focused on the same entity", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: null as string | null };
    layout.mainViewMode = "focus";
    layout.focusedEntityId = "e1";

    focusEntity(layout, "e1", vault);

    // Should return early without changing vault
    expect(vault.selectedEntityId).toBeNull();
    expect(layout.focusedEntityId).toBe("e1");
  });

  it("restores vault selection on exit only when was in focus mode", () => {
    const layout = new LayoutUIStore(new UIPersistence(), null);
    const vault = { selectedEntityId: null as string | null };

    // Not in focus mode — exit call should be a no-op
    focusEntity(layout, null, vault);
    expect(vault.selectedEntityId).toBeNull();

    // Enter focus mode, then exit
    focusEntity(layout, "e2", vault);
    focusEntity(layout, null, vault);
    expect(vault.selectedEntityId).toBe("e2");
  });
});

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
