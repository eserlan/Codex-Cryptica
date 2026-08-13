/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DetailChatsTab from "./DetailChatsTab.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    loadTranscriptsForCharacter: vi.fn().mockResolvedValue([]),
    updateEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    transcripts: {},
    isGenerating: false,
    startChat: vi.fn(),
    sendMessage: vi.fn(),
    saveMessageEdit: vi.fn(),
    deleteMessage: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    resumeSession: vi.fn(),
    startNewSession: vi.fn(),
  },
}));

vi.mock("$lib/stores/proposer.svelte", () => ({
  proposerStore: { promoteToRumor: vi.fn() },
}));

describe("DetailChatsTab", () => {
  const character = {
    id: "char-1",
    title: "Mara the Blacksmith",
    type: "character",
    lore: "## Personality & Voice\nSpeaks plainly.",
    guestChatConfig: {
      isEnabled: true,
      contextScope: "public",
      extraInstructions: "Speaks plainly.",
      isHostReviewable: true,
      keepMemory: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    guestChatStore.transcripts = {};
  });

  it("lets a host start a private character conversation from the Chats tab", async () => {
    render(DetailChatsTab, { entity: character });

    expect(screen.getByText("Character Chat")).toBeTruthy();
    expect(
      screen.getByText(
        "Try this character yourself. Your conversation stays in this browser and is not added to guest logs.",
      ),
    ).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(guestChatStore.startChat).toHaveBeenCalledWith(
      "char-1",
      "Mara the Blacksmith",
      undefined,
    );
  });

  describe("a11y: chat action button labels", () => {
    const transcriptWithMessages = {
      id: "t-1",
      guestId: "guest-abc123",
      guestName: "Alice",
      lastUpdated: Date.now(),
      messages: [
        { id: "m-1", role: "user", content: "Hello there" },
        { id: "m-2", role: "assistant", content: "Hi! How can I help?" },
      ],
    };

    beforeEach(async () => {
      const { vault } = await import("$lib/stores/vault.svelte");
      vi.mocked(vault.loadTranscriptsForCharacter).mockResolvedValue([
        transcriptWithMessages,
      ] as any);
    });

    it("delete-session button has an accessible aria-label and its icon is aria-hidden", async () => {
      render(DetailChatsTab, { entity: character });
      await vi.waitFor(() =>
        screen.getByRole("button", { name: "Delete entire session logs" }),
      );

      const deleteSessionBtn = screen.getByRole("button", {
        name: "Delete entire session logs",
      });
      expect(deleteSessionBtn).toBeTruthy();
      const icon = deleteSessionBtn.querySelector("[aria-hidden]");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
    });

    it("edit-message buttons have an accessible aria-label and their icons are aria-hidden", async () => {
      render(DetailChatsTab, { entity: character });
      await vi.waitFor(() =>
        screen.getAllByRole("button", { name: "Edit message" }),
      );

      const editBtns = screen.getAllByRole("button", { name: "Edit message" });
      expect(editBtns.length).toBeGreaterThan(0);
      for (const btn of editBtns) {
        const icon = btn.querySelector("[aria-hidden]");
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
      }
    });

    it("delete-message buttons have an accessible aria-label and their icons are aria-hidden", async () => {
      render(DetailChatsTab, { entity: character });
      await vi.waitFor(() =>
        screen.getAllByRole("button", { name: "Delete message" }),
      );

      const deleteBtns = screen.getAllByRole("button", {
        name: "Delete message",
      });
      expect(deleteBtns.length).toBeGreaterThan(0);
      for (const btn of deleteBtns) {
        const icon = btn.querySelector("[aria-hidden]");
        expect(icon?.getAttribute("aria-hidden")).toBe("true");
      }
    });
  });
});
