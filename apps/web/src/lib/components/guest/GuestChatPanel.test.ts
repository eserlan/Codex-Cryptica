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

  it("populates cue input with Quick Oracle rolls in GuestChatPanel", async () => {
    render(GuestChatPanel);

    // Toggle Cue input open
    const cueToggle = screen.getByTitle("Toggle Oracle / Director Cue");
    await fireEvent.click(cueToggle);

    const cueInput = screen.getByPlaceholderText(
      /Oracle \/ Director Cue/i,
    ) as HTMLInputElement;
    expect(cueInput.value).toBe("");

    // Click Oracle 50/50
    const oracle50Btn = screen.getByTestId("guest-quick-oracle-btn");
    await fireEvent.click(oracle50Btn);
    expect(cueInput.value).toMatch(
      /^Oracle: (Yes, and\.\.\.|Yes|Yes, but\.\.\.|No, but\.\.\.|No|No, and\.\.\.)$/,
    );

    await fireEvent.click(screen.getByTestId("guest-quick-oracle-likely-btn"));
    expect(cueInput.value).toMatch(/^Oracle \(likely\): /);

    await fireEvent.click(
      screen.getByTestId("guest-quick-oracle-unlikely-btn"),
    );
    expect(cueInput.value).toMatch(/^Oracle \(unlikely\): /);

    // Click 2d6
    const pbtaBtn = screen.getByTestId("guest-quick-pbta-btn");
    await fireEvent.click(pbtaBtn);
    expect(cueInput.value).toMatch(/^2d6 = \d+: (Strong Hit|Weak Hit|Miss)/);

    await fireEvent.click(screen.getByTestId("guest-quick-d20-btn"));
    expect(cueInput.value).toMatch(/^d20 = (?:[1-9]|1\d|20)$/);

    await fireEvent.click(screen.getByTestId("guest-quick-spark-btn"));
    expect(cueInput.value).toMatch(/^Spark: [A-Za-z]+ [A-Za-z ]+$/);
  });
});
