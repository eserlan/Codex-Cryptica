/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import MissingImageResolver from "./MissingImageResolver.svelte";
import type { MissingImageReference } from "@codex/importer";

const fsMocks = vi.hoisted(() => ({
  isFileSystemAccessSupported: vi.fn(() => true),
}));
vi.mock("$lib/utils/fs", () => fsMocks);

function ref(
  overrides: Partial<MissingImageReference> = {},
): MissingImageReference {
  return {
    path: "images/thistle.webp",
    referencedBy: ["entities/thistle.md"],
    resolution: "unresolved",
    ...overrides,
  };
}

describe("MissingImageResolver", () => {
  it("renders nothing when there are no pending refs", () => {
    render(MissingImageResolver, {
      refs: [],
      onAddFile: vi.fn(),
      onUseFolder: vi.fn(),
    });
    expect(screen.queryByTestId("missing-image-resolver")).toBeNull();
  });

  it("renders nothing once a ref is resolved", () => {
    render(MissingImageResolver, {
      refs: [ref({ resolution: "added-directly" })],
      onAddFile: vi.fn(),
      onUseFolder: vi.fn(),
    });
    expect(screen.queryByTestId("missing-image-resolver")).toBeNull();
  });

  it("lists an unresolved image and offers both resolution options when supported", () => {
    fsMocks.isFileSystemAccessSupported.mockReturnValue(true);
    render(MissingImageResolver, {
      refs: [ref()],
      onAddFile: vi.fn(),
      onUseFolder: vi.fn(),
    });

    expect(screen.getByText("images/thistle.webp")).toBeTruthy();
    expect(screen.getByText("Add File")).toBeTruthy();
    expect(screen.getByText("Use Folder")).toBeTruthy();
  });

  it("offers only 'Add File' when folder access isn't supported, with an explanation", () => {
    fsMocks.isFileSystemAccessSupported.mockReturnValue(false);
    render(MissingImageResolver, {
      refs: [ref()],
      onAddFile: vi.fn(),
      onUseFolder: vi.fn(),
    });

    expect(screen.getByText("Add File")).toBeTruthy();
    expect(screen.queryByText("Use Folder")).toBeNull();
    expect(screen.getByText(/can't grant folder access/i)).toBeTruthy();
  });

  it("calls onUseFolder for the right ref when 'Use Folder' is clicked", async () => {
    fsMocks.isFileSystemAccessSupported.mockReturnValue(true);
    const onUseFolder = vi.fn();
    const theRef = ref();
    render(MissingImageResolver, {
      refs: [theRef],
      onAddFile: vi.fn(),
      onUseFolder,
    });

    await fireEvent.click(screen.getByText("Use Folder"));
    expect(onUseFolder).toHaveBeenCalledWith(theRef);
  });
});
