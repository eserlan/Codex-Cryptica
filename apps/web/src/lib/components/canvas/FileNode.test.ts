/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { releaseImageUrl, resolveImageUrl } = vi.hoisted(() => ({
  releaseImageUrl: vi.fn(),
  resolveImageUrl: vi.fn().mockResolvedValue("blob:map"),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { releaseImageUrl, resolveImageUrl },
}));

import FileNode from "./FileNode.svelte";

describe("FileNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveImageUrl.mockResolvedValue("blob:map");
  });

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

  it("renders a resolved image upload as a canvas preview", async () => {
    resolveImageUrl.mockResolvedValue("blob:uploaded-map");
    render(FileNode, {
      props: {
        data: {
          file: {
            path: "files/map-id-map.png",
            name: "uploaded-map.png",
            mimeType: "image/png",
            size: 2048,
          },
        },
        selected: false,
      } as any,
    });

    const preview = await screen.findByRole("img", {
      name: "uploaded-map.png",
    });
    expect(preview.getAttribute("src")).toBe("blob:uploaded-map");
    expect(resolveImageUrl).toHaveBeenCalledWith("files/map-id-map.png");
  });

  it("keeps the file card usable when an image preview cannot resolve", async () => {
    resolveImageUrl.mockResolvedValue("");
    render(FileNode, {
      props: {
        data: {
          file: {
            path: "files/map-id-map.png",
            name: "uploaded-map.png",
            mimeType: "image/png",
            size: 2048,
          },
        },
        selected: false,
      } as any,
    });

    await vi.waitFor(() =>
      expect(resolveImageUrl).toHaveBeenCalledWith("files/map-id-map.png"),
    );
    expect(screen.queryByRole("img", { name: "uploaded-map.png" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open file" })).toBeTruthy();
  });
});
