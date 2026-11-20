import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureArchive from "./AdventureArchive.svelte";
import type {
  AdventureArchiveEntry,
  AdventureListResult,
} from "#lib/services/adventure/adventure-session-repository.js";

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
    rename: vi.fn(async () => ({ ok: true, session: archivedEntry })),
    duplicate: vi.fn(async () => ({
      condition: "duplicated",
      id: "session-2",
    })),
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

  it("renames an archived adventure", async () => {
    const repo = repository();
    render(AdventureArchive, { repository: repo as any, vaultId: "vault-1" });

    await fireEvent.click(
      await screen.findByRole("button", { name: "Rename adventure The Road" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Rename adventure The Road",
    });
    await fireEvent.input(input, { target: { value: "The New Road" } });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(repo.rename).toHaveBeenCalledWith(
        "vault-1",
        "session-1",
        3,
        "The New Road",
      );
    });
  });

  it("rejects an empty rename without calling the repository", async () => {
    const repo = repository();
    render(AdventureArchive, { repository: repo as any, vaultId: "vault-1" });

    await fireEvent.click(
      await screen.findByRole("button", { name: "Rename adventure The Road" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Rename adventure The Road",
    });
    await fireEvent.input(input, { target: { value: "   " } });
    await fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(repo.rename).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("cannot be empty");
  });

  it("duplicates an adventure without deleting or altering the source", async () => {
    const repo = repository();
    render(AdventureArchive, { repository: repo as any, vaultId: "vault-1" });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Duplicate adventure The Road",
      }),
    );

    await waitFor(() => {
      expect(repo.duplicate).toHaveBeenCalledWith("vault-1", "session-1");
    });
    expect(repo.deleteArchived).not.toHaveBeenCalled();
  });

  it("filters the archive by title and premise text", async () => {
    const repo = repository();
    repo.list.mockResolvedValue({
      effectiveActiveId: null,
      entries: [
        archivedEntry,
        {
          id: "session-2",
          title: "The Sunken Bell",
          status: "archived",
          revision: 1,
          loadCondition: "normal",
          premise: "A bell rings beneath the flood.",
        },
      ],
    });
    render(AdventureArchive, { repository: repo as any, vaultId: "vault-1" });

    await screen.findByRole("button", { name: "Open adventure The Road" });
    await fireEvent.input(
      screen.getByRole("searchbox", { name: "Search adventure archive" }),
      { target: { value: "flood" } },
    );

    expect(
      screen.queryByRole("button", { name: "Open adventure The Road" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open adventure The Sunken Bell" }),
    ).toBeTruthy();
  });

  it("resumes an archived adventure as active", async () => {
    const repo = repository();
    const onResumeArchived = vi.fn(async () => undefined);
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      onResumeArchived,
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Resume archived adventure The Road",
      }),
    );

    expect(onResumeArchived).toHaveBeenCalledWith("session-1");
  });

  it("shows why an archived adventure could not be resumed", async () => {
    const repo = repository();
    const onResumeArchived = vi.fn(async () => {
      throw new Error("resume-failed");
    });
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      onResumeArchived,
    });

    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Resume archived adventure The Road",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("resume-failed");
    });
  });

  it.each([320, 360, 390, 430])(
    "renders a stacked mobile archive card with distinct status, truncated package summary, full metadata tooltip, and accessible actions at %ipx (#5053)",
    async (width) => {
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: width,
      });

      try {
        const longHash =
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
        const longSlug =
          "electric-razor-downtown-substation-blackout-chronicle";
        const repo = repository();
        repo.list.mockResolvedValue({
          effectiveActiveId: "electric-1",
          entries: [
            {
              id: "electric-1",
              title: "Electric Razor",
              status: "active",
              revision: 2,
              loadCondition: "normal",
              sourcePackage: {
                packageId: longSlug,
                version: "1.0.0",
                formatVersion: "adventure-json/v1",
                hash: longHash,
              },
            },
          ],
        });
        const onResume = vi.fn(async () => undefined);
        render(AdventureArchive, {
          repository: repo as any,
          vaultId: "vault-1",
          onResume,
        });

        const openBtn = await screen.findByRole("button", {
          name: "Open adventure Electric Razor",
        });
        const card = screen.getByTestId("archive-entry-card");
        const titleEl = screen.getByTestId("archive-entry-title");
        const statusEl = screen.getByTestId("archive-entry-status");
        const pkgEl = screen.getByTestId("archive-entry-source-package");
        const actionsRow = screen.getByTestId("archive-entry-actions");
        const resumeBtn = screen.getByRole("button", {
          name: "Resume active adventure Electric Razor",
        });
        const renameBtn = screen.getByRole("button", {
          name: "Rename adventure Electric Razor",
        });
        const duplicateBtn = screen.getByRole("button", {
          name: "Duplicate adventure Electric Razor",
        });

        // Stacked mobile card layout transitioning to horizontal row on sm+ breakpoints.
        expect(card.className).toContain("flex-col");
        expect(card.className).toContain("sm:flex-row");
        expect(card.className).toContain("min-w-0");

        // Title and status stay distinct in the top row without overlapping.
        expect(titleEl.textContent?.trim()).toBe("Electric Razor");
        expect(titleEl.className).toContain("min-w-0");
        expect(titleEl.className).toContain("break-words");
        expect(statusEl.textContent?.trim()).toBe("active");
        expect(statusEl.className).toContain("shrink-0");

        // Secondary package metadata line is truncated cleanly while exposing full metadata via title and aria-label.
        expect(pkgEl.textContent?.trim()).toBe(
          `${longSlug} v1.0.0 · ${longHash.slice(0, 8)}`,
        );
        expect(pkgEl.className).toContain("truncate");
        expect(pkgEl.className).toContain("min-w-0");
        expect(pkgEl.getAttribute("title")).toBe(
          `${longSlug} v1.0.0 · ${longHash}`,
        );
        expect(pkgEl.getAttribute("aria-label")).toContain(longSlug);
        expect(pkgEl.getAttribute("aria-label")).toContain("version 1.0.0");

        // Actions sit in a dedicated compact bottom row with >=44px targets (min-h-11 / min-h-12), distinct screen-reader names, and keyboard focus rings.
        expect(actionsRow.className).toContain("flex-wrap");
        for (const btn of [openBtn, resumeBtn, renameBtn, duplicateBtn]) {
          expect(btn.className).toMatch(/min-h-1[12]/);
          expect(btn.className).toContain("focus-visible:outline-2");
        }
        expect(renameBtn.className).toContain("min-w-11");
        expect(duplicateBtn.className).toContain("min-w-11");
        expect(renameBtn.textContent).toContain("Rename");
        expect(duplicateBtn.textContent).toContain("Duplicate");

        await fireEvent.click(resumeBtn);
        expect(onResume).toHaveBeenCalledWith("electric-1");
      } finally {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          writable: true,
          value: originalInnerWidth,
        });
      }
    },
  );

  it("omits the actions row when a read-only entry has no available actions", async () => {
    const repo = repository();
    repo.list.mockResolvedValue({
      effectiveActiveId: "readonly-1",
      entries: [
        {
          id: "readonly-1",
          title: "Legacy Recovery Run",
          status: "active",
          loadCondition: "migration-recovery",
        },
      ],
    });
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
    });

    await screen.findByRole("button", {
      name: "Open adventure Legacy Recovery Run",
    });
    expect(screen.queryByTestId("archive-entry-actions")).toBeNull();
    expect(screen.queryByTestId("archive-entry-source-package")).toBeNull();
  });
});
