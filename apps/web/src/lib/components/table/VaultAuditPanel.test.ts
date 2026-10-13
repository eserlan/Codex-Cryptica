/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import VaultAuditPanel from "./VaultAuditPanel.svelte";

describe("VaultAuditPanel component", () => {
  it("does not expose an unnamed tabpanel when distribution is unavailable", () => {
    render(VaultAuditPanel, {
      counts: {
        totalEntities: 1,
        missingImages: 1,
        missingDescriptions: 0,
        zeroConnections: 0,
        unlabelled: 0,
        incomplete: 0,
      },
      onApplyPreset: vi.fn(),
      onDrillDown: vi.fn(),
      onClose: vi.fn(),
    });

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByTestId("audit-card-missing-images")).toBeTruthy();
  });
});
