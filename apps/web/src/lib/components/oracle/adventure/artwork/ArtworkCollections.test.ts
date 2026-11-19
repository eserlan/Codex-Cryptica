import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ArtworkCollections from "./ArtworkCollections.svelte";

const pack = {
  id: "pack-fantasy",
  title: "Fantasy Locations",
  credits: "Codex Cryptica Team (AI-assisted)",
  declaredBytes: 4 * 1024 * 1024,
  assetCount: 12,
  installed: false,
  verifiedOffline: false,
};

describe("artwork collections UI", () => {
  it("discloses size, credits and separate storage scopes before install", () => {
    render(ArtworkCollections, {
      props: {
        collections: [pack],
        automaticCacheBytes: 2 * 1024 * 1024,
        privateSnapshotBytes: 1024 * 1024,
        onInstall: vi.fn(),
        onRemove: vi.fn(),
      },
    });
    expect(screen.getByText("Fantasy Locations")).toBeTruthy();
    expect(screen.getByText(/4\.0 MB/)).toBeTruthy();
    expect(screen.getByText(/Codex Cryptica Team/)).toBeTruthy();
    expect(screen.getByText(/Private Vault snapshots: 1\.0 MB/)).toBeTruthy();
    expect(screen.getByText(/Disposable public cache: 2\.0 MB/)).toBeTruthy();
  });

  it("supports download progress, cancellation and explicit retry", async () => {
    let abortSignal: AbortSignal | undefined;
    const onInstall = vi
      .fn()
      .mockImplementationOnce(
        async (
          _id: string,
          signal: AbortSignal,
          onProgress: (completed: number, total: number) => void,
        ) => {
          abortSignal = signal;
          onProgress(1, 3);
          return new Promise((resolve) => {
            signal.addEventListener(
              "abort",
              () => resolve({ status: "cancelled", completed: 1, total: 3 }),
              { once: true },
            );
          });
        },
      )
      .mockResolvedValueOnce({ status: "installed", completed: 3, total: 3 });

    render(ArtworkCollections, {
      props: {
        collections: [pack],
        onInstall,
        onRemove: vi.fn(),
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /Download Fantasy Locations/i }),
    );
    expect(screen.getByText(/1 \/ 3 files/)).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: /Cancel download/i }),
    );
    expect(abortSignal?.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.getByText(/Download cancelled/i)).toBeTruthy(),
    );

    await fireEvent.click(
      screen.getByRole("button", { name: /Retry Fantasy Locations/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Installed and verified offline/i)).toBeTruthy(),
    );
  });

  it("refuses over-capacity installs without evicting packs and allows removal", async () => {
    const onRemove = vi.fn(async () => {});
    const onInstall = vi.fn(async () => ({
      status: "capacity" as const,
      completed: 0,
      total: 12,
    }));

    render(ArtworkCollections, {
      props: {
        collections: [
          pack,
          {
            ...pack,
            id: "pack-scifi",
            title: "Sci-Fi Stations",
            installed: true,
            verifiedOffline: true,
          },
        ],
        onInstall,
        onRemove,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /Download Fantasy Locations/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Not enough offline storage/i)).toBeTruthy(),
    );

    await fireEvent.click(
      screen.getByRole("button", { name: /Remove Sci-Fi Stations/i }),
    );
    expect(onRemove).toHaveBeenCalledWith("pack-scifi");
  });
});
