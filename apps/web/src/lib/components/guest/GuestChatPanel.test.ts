/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuestChatPanel from "./GuestChatPanel.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    allEntities: [
      {
        id: "char-1",
        title: "Mara the Blacksmith",
        type: "character",
        guestChatConfig: {
          isEnabled: true,
          extraInstructions: "Speaks plainly.",
        },
      },
    ],
    defaultVisibility: "public",
  },
}));

vi.mock("$lib/services/character-chat-export", () => ({
  characterChatExportService: {
    copyConversation: vi.fn().mockResolvedValue(true),
    sendConversationToJournal: vi.fn().mockResolvedValue("new-note-id"),
  },
}));

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    activeCharacterId: "char-1",
    activeTranscript: {
      id: "t-1",
      guestId: "g-1",
      guestName: "Guest",
      characterId: "char-1",
      characterTitle: "Mara the Blacksmith",
      lastUpdated: Date.now(),
      messages: [
        { id: "m-1", role: "user", content: "Hello", timestamp: 1 },
        { id: "m-2", role: "assistant", content: "Greetings", timestamp: 2 },
      ],
    },
    isGenerating: false,
    startChat: vi.fn(),
    sendMessage: vi.fn(),
    clearTranscript: vi.fn(),
  },
}));

describe("GuestChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active character chat header and action buttons", () => {
    render(GuestChatPanel);

    expect(
      screen.getByRole("heading", { name: "Mara the Blacksmith" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Copy conversation" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Send to Journal" }),
    ).toBeTruthy();
  });

  it("clicking Copy triggers characterChatExportService.copyConversation", async () => {
    render(GuestChatPanel);

    const copyBtn = screen.getByRole("button", { name: "Copy conversation" });
    await fireEvent.click(copyBtn);

    const { characterChatExportService } =
      await import("$lib/services/character-chat-export");
    expect(characterChatExportService.copyConversation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-1" }),
      expect.objectContaining({ characterTitle: "Mara the Blacksmith" }),
    );
  });

  it("clicking Journal triggers characterChatExportService.sendConversationToJournal", async () => {
    render(GuestChatPanel);

    const journalBtn = screen.getByRole("button", { name: "Send to Journal" });
    await fireEvent.click(journalBtn);

    const { characterChatExportService } =
      await import("$lib/services/character-chat-export");
    expect(
      characterChatExportService.sendConversationToJournal,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-1" }),
      expect.objectContaining({ characterTitle: "Mara the Blacksmith" }),
    );
  });
});
