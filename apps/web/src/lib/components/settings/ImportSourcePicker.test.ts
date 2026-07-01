/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ImportSourcePicker from "./ImportSourcePicker.svelte";

describe("ImportSourcePicker", () => {
  const baseProps = {
    isStandalone: false,
    oracleEnabled: true,
    showResumeToast: false,
    onRestart: vi.fn(),
    onFileSelect: vi.fn(),
    masterPacks: [],
    getSubpacks: vi.fn(() => []),
    getPackImportStatus: vi.fn(),
    expandedPacks: {},
    onTogglePackExpanded: vi.fn(),
    onPackSelect: vi.fn(),
  };

  it("shows deterministic Scabard and Chronica import guidance before file selection", () => {
    render(ImportSourcePicker, baseProps);

    expect(screen.getByText("Scabard and Chronica")).toBeTruthy();
    expect(
      screen.getByText(
        /JSON exports use a deterministic review and import flow/,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Documents and notes")).toBeTruthy();
  });
});
