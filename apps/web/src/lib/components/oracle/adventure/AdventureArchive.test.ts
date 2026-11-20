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

  it("keeps long active package metadata readable in the mobile card layout", async () => {
    const repo = repository();
    const packageId = "electric-razor-adventure-package-with-a-very-long-slug";
    const hash = "a".repeat(64);
    repo.list.mockResolvedValue({
      effectiveActiveId: "active-1",
      entries: [
        {
          id: "active-1",
          title: "Electric Razor and the Extremely Long Adventure Title",
          status: "active",
          revision: 1,
          loadCondition: "normal",
          sourcePackage: {
            packageId,
            version: "2026.11.20-preview",
            formatVersion: "1",
            hash,
          },
        },
      ],
    });
    render(AdventureArchive, {
      repository: repo as any,
      vaultId: "vault-1",
      onResume: vi.fn(async () => undefined),
    });

    const openButton = await screen.findByRole("button", {
      name: "Open adventure Electric Razor and the Extremely Long Adventure Title",
    });
    const card = screen.getByTestId("archive-entry-display");
    expect(card?.className).toContain("flex-col");
    expect(card?.className).toContain("md:flex-row");
    expect(screen.getByText("active")).toBeTruthy();

    const summary = screen.getByTestId("archive-entry-source-package");
    expect(summary.textContent).toContain("2026.11.20-preview");
    expect(summary.textContent).toContain("electric-razor-adventure");
    await fireEvent.click(summary);
    const fullMetadata = summary.closest("details")?.textContent ?? "";
    expect(fullMetadata).toContain(`Package ID: ${packageId}`);
    expect(fullMetadata).toContain("Version: 2026.11.20-preview");
    expect(fullMetadata).toContain(`Hash: ${hash}`);

    const resume = screen.getByRole("button", {
      name: "Resume active adventure Electric Razor and the Extremely Long Adventure Title",
    });
    const rename = screen.getByRole("button", {
      name: "Rename adventure Electric Razor and the Extremely Long Adventure Title",
    });
    const duplicate = screen.getByRole("button", {
      name: "Duplicate adventure Electric Razor and the Extremely Long Adventure Title",
    });
    expect(resume.className).toContain("bg-theme-primary");
    expect(rename.className).toContain("min-h-11");
    expect(rename.className).toContain("min-w-11");
    expect(duplicate.className).toContain("min-h-11");
    expect(duplicate.className).toContain("min-w-11");

    for (const width of [320, 360, 390, 430]) {
      window.innerWidth = width;
      expect(card?.className).toContain("flex-col");
      expect(summary.textContent).toContain("2026.11.20-preview");
      expect(resume).toBeTruthy();
      expect(rename).toBeTruthy();
      expect(duplicate).toBeTruthy();
    }
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
});
