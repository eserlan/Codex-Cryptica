/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const { resolveImageUrl } = vi.hoisted(() => ({
  resolveImageUrl: vi.fn().mockResolvedValue("blob:map"),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { resolveImageUrl },
}));

import FileNode from "./FileNode.svelte";

describe("FileNode", () => {
  it("shows vault file metadata and opens the stored file", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(FileNode, {
      props: {
        data: {
          file: {
            path: "files/map-id-map.pdf",
            name: "map.pdf",
            mimeType: "application/pdf",
            size: 2048,
          },
        },
        selected: false,
      } as any,
    });

    expect(screen.getByRole("article", { name: "File: map.pdf" })).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Open file" }));

    expect(resolveImageUrl).toHaveBeenCalledWith("files/map-id-map.pdf");
    expect(open).toHaveBeenCalledWith("blob:map", "_blank", "noopener");
  });

  it("renders a safe fallback when persisted file metadata is missing", () => {
    render(FileNode, { props: { data: {}, selected: false } as any });

    expect(screen.getByRole("article", { name: "Stored file" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open file" })).toBeNull();
  });
});
