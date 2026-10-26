/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CharacterChat from "./CharacterChat.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {
      "char-1": {
        id: "char-1",
        title: "Mara the Blacksmith",
        type: "character",
      },
      "char-2": {
        id: "char-2",
        title: "Tarin the Ranger",
        type: "character",
      },
    },
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

vi.mock("$lib/services/character-chat-export", () => ({
  characterChatExportService: {
    copyConversation: vi.fn().mockResolvedValue(true),
    sendConversationToJournal: vi.fn().mockResolvedValue("new-note-id"),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

describe("CharacterChat", () => {
  const character = {
    id: "char-1",
    title: "Mara the Blacksmith",
    type: "character",
    guestChatConfig: { isEnabled: true },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    guestChatStore.transcripts = {};
    guestChatStore.isGenerating = false;
  });

  it("displays a voice guidance warning when character lacks personality notes", () => {
    render(CharacterChat, { entity: character });

    expect(screen.getByText("Voice Guidance Missing")).toBeTruthy();
    expect(screen.getByText(/This character lacks a/i)).toBeTruthy();
  });

  it("does not show voice guidance warning when personality notes are present in lore", () => {
    render(CharacterChat, {
      entity: {
        ...character,
        lore: "## Personality & Voice\n- Speaks gruffly.",
      },
    });

    expect(screen.queryByText("Voice Guidance Missing")).toBeNull();
  });

  it("lets a host start a character chat once it is enabled", async () => {
    render(CharacterChat, { entity: character });

    await fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(guestChatStore.startChat).toHaveBeenCalledWith(
      "char-1",
      "Mara the Blacksmith",
      undefined,
    );
  });

  it("starts a host conversation as the selected campaign character", async () => {
    render(CharacterChat, { entity: character });

    await fireEvent.change(screen.getByLabelText("Chat as"), {
      target: { value: "char-2" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(guestChatStore.startChat).toHaveBeenCalledWith(
      "char-1",
      "Mara the Blacksmith",
      "char-2",
    );
  });

  it("ignores repeated Connect clicks while starting a chat", async () => {
    let resolveStart!: () => void;
    vi.mocked(guestChatStore.startChat).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      }),
    );
    render(CharacterChat, { entity: character });

    const connectButton = screen.getByRole("button", { name: "Connect" });
    await fireEvent.click(connectButton);

    expect((connectButton as HTMLButtonElement).disabled).toBe(true);
    expect(guestChatStore.startChat).toHaveBeenCalledOnce();

    await fireEvent.click(connectButton);
    expect(guestChatStore.startChat).toHaveBeenCalledOnce();

    resolveStart();
    await waitFor(() => {
      expect((connectButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("does not offer a chat connection while the character is disabled", () => {
    render(CharacterChat, {
      entity: {
        ...character,
        guestChatConfig: { isEnabled: false },
      },
    });

    expect(screen.getByText("Chat Disabled")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect" })).toBeNull();
  });

  describe("with an active conversation", () => {
    const activeTranscript = {
      id: "transcript-active",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-1",
      characterTitle: "Mara the Blacksmith",
      messages: [],
      lastUpdated: 200,
    };
    const otherSession = {
      id: "transcript-other",
      guestId: "guest-local",
      guestName: "Invited Guest",
      characterId: "char-1",
      characterTitle: "Mara the Blacksmith",
      speakerCharacterId: "char-2",
      messages: [{ id: "m1", role: "user", content: "hi", timestamp: 1 }],
      lastUpdated: 100,
    };

    beforeEach(() => {
      guestChatStore.transcripts = { "char-1": activeTranscript as any };
    });

    it("opening Sessions renders the switcher panel", async () => {
      render(CharacterChat, { entity: character });

      await fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));

      expect(screen.getByText("Start a New Chat as")).toBeTruthy();
    });

    it("starting a new chat calls guestChatStore.startNewSession with the selected speaker", async () => {
      render(CharacterChat, { entity: character });

      await fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));
      await fireEvent.change(screen.getByLabelText("Start a New Chat as"), {
        target: { value: "char-2" },
      });
      await fireEvent.click(
        screen.getByRole("button", { name: "Start New Chat" }),
      );

      expect(guestChatStore.startNewSession).toHaveBeenCalledWith(
        "char-1",
        "Mara the Blacksmith",
        "char-2",
      );
    });

    it("resuming a previous session calls guestChatStore.resumeSession with its id", async () => {
      vi.mocked(guestChatStore.listSessions).mockResolvedValueOnce([
        activeTranscript,
        otherSession,
      ] as any);
      render(CharacterChat, { entity: character });

      await fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));
      await waitFor(() => {
        expect(screen.getByText("Resume a Previous Conversation")).toBeTruthy();
      });
      await fireEvent.click(
        screen.getByRole("button", { name: /Tarin the Ranger/ }),
      );

      expect(guestChatStore.resumeSession).toHaveBeenCalledWith(
        "char-1",
        "transcript-other",
      );
    });

    it("clicking Copy triggers characterChatExportService.copyConversation", async () => {
      guestChatStore.transcripts = {
        "char-1": {
          ...activeTranscript,
          messages: [
            { id: "m1", role: "user", content: "Hello", timestamp: 1 },
          ],
        } as any,
      };
      render(CharacterChat, { entity: character });

      const copyButton = screen.getByRole("button", {
        name: "Copy conversation",
      });
      await fireEvent.click(copyButton);

      const { characterChatExportService } =
        await import("$lib/services/character-chat-export");
      expect(characterChatExportService.copyConversation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "transcript-active" }),
        expect.objectContaining({ characterTitle: "Mara the Blacksmith" }),
      );
    });

    it("clicking Journal triggers characterChatExportService.sendConversationToJournal", async () => {
      guestChatStore.transcripts = {
        "char-1": {
          ...activeTranscript,
          messages: [
            { id: "m1", role: "user", content: "Hello", timestamp: 1 },
          ],
        } as any,
      };
      render(CharacterChat, { entity: character });

      const journalButton = screen.getByRole("button", {
        name: "Send to Journal",
      });
      await fireEvent.click(journalButton);

      const { characterChatExportService } =
        await import("$lib/services/character-chat-export");
      expect(
        characterChatExportService.sendConversationToJournal,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: "transcript-active" }),
        expect.objectContaining({ characterTitle: "Mara the Blacksmith" }),
      );
    });

    it("toggling director cue opens cue input and sends cue with message", async () => {
      render(CharacterChat, { entity: character });

      const cueToggle = screen.getByRole("button", {
        name: "Toggle Oracle / Director Cue",
      });
      await fireEvent.click(cueToggle);

      const cueInput = screen.getByLabelText("Oracle / Director Cue");
      await fireEvent.input(cueInput, {
        target: { value: "Suspicious / Yes, but..." },
      });

      const messageInput = screen.getByLabelText("Message Mara the Blacksmith");
      await fireEvent.input(messageInput, {
        target: { value: "Can I inspect the forge?" },
      });

      const sendButton = screen.getByRole("button", {
        name: "Send message to Mara the Blacksmith",
      });
      await fireEvent.click(sendButton);

      expect(guestChatStore.sendMessage).toHaveBeenCalledWith(
        "char-1",
        "Can I inspect the forge?",
        "Suspicious / Yes, but...",
      );
    });

    it("renders cue badge when a message has a cue", () => {
      guestChatStore.transcripts = {
        "char-1": {
          ...activeTranscript,
          messages: [
            {
              id: "m1",
              role: "user",
              content: "Show me the sword.",
              cue: "Reluctant / 2d6 = 4",
              timestamp: 1,
            },
          ],
        } as any,
      };
      render(CharacterChat, { entity: character });

      expect(screen.getByText("Cue: Reluctant / 2d6 = 4")).toBeTruthy();
    });

    it("deleting a message asks for confirmation via notificationStore.confirm", async () => {
      const { notificationStore } =
        await import("$lib/stores/ui/notification.svelte");
      guestChatStore.transcripts = {
        "char-1": {
          ...activeTranscript,
          messages: [
            {
              id: "m1",
              role: "user",
              content: "Show me the sword.",
              timestamp: 1,
            },
          ],
        } as any,
      };
      render(CharacterChat, { entity: character });

      const deleteBtn = screen.getByTitle("Delete message");
      await fireEvent.click(deleteBtn);

      expect(notificationStore.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Delete Message",
          confirmLabel: "Delete",
          isDangerous: true,
        }),
      );
      expect(guestChatStore.deleteMessage).toHaveBeenCalledWith("char-1", "m1");
    });

    it("populates cue input with Quick Oracle rolls when buttons are clicked", async () => {
      guestChatStore.transcripts = {
        "char-1": { ...activeTranscript, messages: [] } as any,
      };
      render(CharacterChat, { entity: character });

      // Toggle Cue input open
      const cueToggle = screen.getByTitle("Toggle Oracle / Director Cue");
      await fireEvent.click(cueToggle);

      const cueInput = screen.getByPlaceholderText(
        /Oracle \/ Director Cue/i,
      ) as HTMLInputElement;
      expect(cueInput.value).toBe("");

      // Click Oracle 50/50
      const oracle50Btn = screen.getByTestId("quick-oracle-btn");
      await fireEvent.click(oracle50Btn);
      expect(cueInput.value).toMatch(
        /^Oracle: (Yes, and\.\.\.|Yes|Yes, but\.\.\.|No, but\.\.\.|No|No, and\.\.\.)$/,
      );

      await fireEvent.click(screen.getByTestId("quick-oracle-likely-btn"));
      expect(cueInput.value).toMatch(/^Oracle \(likely\): /);

      await fireEvent.click(screen.getByTestId("quick-oracle-unlikely-btn"));
      expect(cueInput.value).toMatch(/^Oracle \(unlikely\): /);

      // Click 2d6
      const pbtaBtn = screen.getByTestId("quick-pbta-btn");
      await fireEvent.click(pbtaBtn);
      expect(cueInput.value).toMatch(/^2d6 = \d+: (Strong Hit|Weak Hit|Miss)/);

      // Click d20
      const d20Btn = screen.getByTestId("quick-d20-btn");
      await fireEvent.click(d20Btn);
      expect(cueInput.value).toMatch(/^d20 = (?:[1-9]|1\d|20)$/);

      // Click Spark
      const sparkBtn = screen.getByTestId("quick-spark-btn");
      await fireEvent.click(sparkBtn);
      expect(cueInput.value).toMatch(/^Spark: [A-Za-z]+ [A-Za-z ]+$/);
    });
  });
});
