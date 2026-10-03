/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ZenConnectionRow from "./ZenConnectionRow.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false },
}));

const conn = {
  id: "e2",
  title: "Dûm-Gor'Zan (The Bloodforged Warband)",
  displayLabel: "Subgroup of",
  type: "subgroup",
  isOutbound: true,
  isChild: false,
} as any;

function renderRow(overrides: Record<string, unknown> = {}) {
  const props = {
    conn,
    entity: { id: "e1" } as any,
    isEditing: false,
    onStartEditing: vi.fn(),
    onStopEditing: vi.fn(),
    onOpenChild: vi.fn(),
    onDelete: vi.fn(),
    onNavigate: vi.fn(),
    ...overrides,
  };
  render(ZenConnectionRow, { props });
  return props;
}

describe("ZenConnectionRow mobile typography", () => {
  it("shows the title at 16px on mobile and lets it wrap instead of truncating", () => {
    renderRow();
    const title = screen.getByText(conn.title);
    expect(title.className).toContain("text-base");
    expect(title.className).toContain("md:text-sm");
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("md:truncate");
  });

  it("keeps the relation label at 14px on mobile", () => {
    renderRow();
    const label = screen.getByText("Subgroup of");
    expect(label.className).toContain("text-sm");
    expect(label.className).toContain("md:text-xs");
  });

  it("still navigates when the row is tapped", async () => {
    const props = renderRow();
    await fireEvent.click(screen.getByText(conn.title));
    expect(props.onNavigate).toHaveBeenCalledWith("e2");
  });

  it("does not navigate while the connection is being edited", () => {
    const props = renderRow({ isEditing: true });
    expect(screen.queryByText(conn.title)).toBeNull();
    expect(props.onNavigate).not.toHaveBeenCalled();
  });
});
