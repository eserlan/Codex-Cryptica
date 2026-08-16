import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureArchive from "./AdventureArchive.svelte";
import type {
  AdventureArchiveEntry,
  AdventureListResult,
} from "$lib/services/adventure/adventure-session-repository";

const archivedEntry: AdventureArchiveEntry = {
  id: "session-1",
  title: "The Road",
  status: "archived" as const,
  updatedAt: "2026-08-16T12:00:00.000Z",
  revision: 3,
  loadCondition: "normal" as const,
};

function repository() {
  return {
    list: vi.fn(async (_vaultId: string): Promise<AdventureListResult> => ({
      effectiveActiveId: null,
      entries: [archivedEntry],
    })),
    load: vi.fn(),
    deleteArchived: vi.fn(async () => ({ ok: true })),
    deleteUnreadable: vi.fn(async () => ({ ok: true })),
  };
}

describe("AdventureArchive", () => {
  it("deletes an archived adventure after confirmation", async () => {
    const repo = repository();
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      confirm: vi.fn(async () => true),
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete archived adventure The Road",
      }),
    );

    await waitFor(() => {
      expect(repo.deleteArchived).toHaveBeenCalledWith(
        "vault-1",
        "session-1",
        3,
      );
    });
  });

  it("deletes an unreadable adventure after confirmation", async () => {
    const repo = repository();
    repo.list.mockResolvedValue({
      effectiveActiveId: null,
      entries: [
        {
          id: "broken-1",
          title: "Unreadable adventure",
          status: "unreadable",
          loadCondition: "unreadable",
        },
      ],
    });
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      confirm: vi.fn(async () => true),
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete unreadable adventure Unreadable adventure",
      }),
    );

    await waitFor(() => {
      expect(repo.deleteUnreadable).toHaveBeenCalledWith("vault-1", "broken-1");
    });
  });

  it("keeps an archived adventure when confirmation is cancelled", async () => {
    const repo = repository();
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      confirm: vi.fn(async () => false),
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete archived adventure The Road",
      }),
    );

    expect(repo.deleteArchived).not.toHaveBeenCalled();
  });

  it("resumes a readable active adventure", async () => {
    const repo = repository();
    repo.list.mockResolvedValue({
      effectiveActiveId: "active-1",
      entries: [
        {
          id: "active-1",
          title: "The Living Road",
          status: "active",
          loadCondition: "normal",
        },
      ],
    });
    const onResume = vi.fn(async () => undefined);
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      onResume,
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Resume active adventure The Living Road",
      }),
    );

    expect(onResume).toHaveBeenCalledWith("active-1");
  });

  it("reloads entries and clears the selected transcript when the vault changes", async () => {
    const repo = repository();
    repo.list.mockImplementation(async (vaultId: string) => ({
      effectiveActiveId: null,
      entries:
        vaultId === "vault-1"
          ? [archivedEntry]
          : [
              {
                ...archivedEntry,
                id: "session-2",
                title: "The Other Road",
              },
            ],
    }));
    repo.load.mockResolvedValue({
      condition: "normal",
      session: { id: "session-1", turns: [] },
    });
    const { rerender } = render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
    });

    await fireEvent.click(
      await screen.findByRole("button", { name: "Open adventure The Road" }),
    );
    expect(screen.getByText(/this transcript is read-only/i)).toBeTruthy();

    await rerender({ repository: repo as any, vaultId: "vault-2" });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open adventure The Other Road" }),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/this transcript is read-only/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Open adventure The Road" }),
    ).toBeNull();
  });
});
