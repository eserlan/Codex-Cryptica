/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import AdventureNodeDrawer from "./AdventureNodeDrawer.svelte";
import type { AdventureNode as AdventureNodeType } from "generator-engine";

describe("AdventureNodeDrawer Component", () => {
  it("edits node content and triggers onSave callback", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    const mockNode: AdventureNodeType = {
      id: "node-loc-0",
      type: "location",
      position: { x: 100, y: 100 },
      data: {
        title: "Old Sanctuary",
        type: "location",
        description: "An abandoned shrine.",
        canLaunchDungeon: true,
      },
    };

    render(AdventureNodeDrawer, {
      props: {
        node: mockNode,
        isOpen: true,
        onClose,
        onSave,
      },
    });

    expect(screen.getByText("Edit Node: LOCATION")).toBeTruthy();

    const saveBtn = screen.getByText("Save Changes");
    await fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
