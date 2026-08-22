import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CharacterChatExportService,
  type CharacterChatExportDependencies,
} from "./character-chat-export";
import type { GuestChatTranscript, Entity } from "schema";

describe("CharacterChatExportService", () => {
  let mockClipboardService: NonNullable<
    CharacterChatExportDependencies["clipboardService"]
  >;
  let mockNotificationStore: NonNullable<
    CharacterChatExportDependencies["notificationStore"]
  >;
  let mockVault: NonNullable<CharacterChatExportDependencies["vault"]>;
  let service: CharacterChatExportService;

  const mockEntities: Record<string, Entity> = {
    "char-1": {
      id: "char-1",
      title: "Livia Varro",
      type: "character",
      content: "",
      tags: [],
    } as unknown as Entity,
    "char-2": {
      id: "char-2",
      title: "Tao Ren",
      type: "character",
      content: "",
      tags: [],
    } as unknown as Entity,
  };

  const sampleTranscript: GuestChatTranscript = {
    id: "transcript-1",
    guestId: "guest-123",
    guestName: "Traveler",
    characterId: "char-1",
    characterTitle: "Livia Varro",
    speakerCharacterId: "char-2",
    lastUpdated: 1700000000000,
    messages: [
      {
        id: "m1",
        role: "user",
        content:
          "Do you mind if I sit here a while and share this ale in your company?",
        timestamp: 1700000001000,
      },
      {
        id: "m2",
        role: "assistant",
        content: "Sit, if you like. I don't mind the company...",
        timestamp: 1700000002000,
      },
    ],
  };

  beforeEach(() => {
    mockClipboardService = {
      copyHtmlAndText: vi.fn().mockResolvedValue(true),
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    mockNotificationStore = {
      notify: vi.fn(),
    };
    mockVault = {
      entities: { ...mockEntities },
      createEntity: vi.fn().mockResolvedValue("new-note-id"),
      selectedEntityId: null,
    };
    service = new CharacterChatExportService({
      clipboardService: mockClipboardService,
      notificationStore: mockNotificationStore,
      vault: mockVault,
    });
  });

  describe("resolveSpeakerName and resolveCharacterTitle", () => {
    it("resolves speaker from override first", () => {
      const name = service.resolveSpeakerName(
        sampleTranscript,
        "Custom Speaker",
      );
      expect(name).toBe("Custom Speaker");
    });

    it("resolves speaker from vault entity matching speakerCharacterId", () => {
      const name = service.resolveSpeakerName(sampleTranscript);
      expect(name).toBe("Tao Ren");
    });

    it("resolves speaker from guestName if speakerCharacterId has no entity", () => {
      const transcriptWithoutSpeakerEntity: GuestChatTranscript = {
        ...sampleTranscript,
        speakerCharacterId: undefined,
      };
      const name = service.resolveSpeakerName(transcriptWithoutSpeakerEntity);
      expect(name).toBe("Traveler");
    });

    it("falls back to 'You' if no speaker info is present", () => {
      const emptyTranscript: GuestChatTranscript = {
        ...sampleTranscript,
        speakerCharacterId: undefined,
        guestName: "",
      };
      const name = service.resolveSpeakerName(emptyTranscript);
      expect(name).toBe("You");
    });

    it("resolves character title from override, transcript, or vault", () => {
      expect(service.resolveCharacterTitle(sampleTranscript, "Custom")).toBe(
        "Custom",
      );
      expect(service.resolveCharacterTitle(sampleTranscript)).toBe(
        "Livia Varro",
      );
      const noTitleTranscript: GuestChatTranscript = {
        ...sampleTranscript,
        characterTitle: "",
      };
      expect(service.resolveCharacterTitle(noTitleTranscript)).toBe(
        "Livia Varro",
      );
    });
  });

  describe("formatConversationMarkdown", () => {
    it("formats a multi-message transcript cleanly into markdown", () => {
      const md = service.formatConversationMarkdown(sampleTranscript);
      expect(md).toContain("## Tao Ren & Livia Varro — Conversation");
      expect(md).toContain(
        "**Tao Ren:** Do you mind if I sit here a while and share this ale in your company?",
      );
      expect(md).toContain(
        "**Livia Varro:** Sit, if you like. I don't mind the company...",
      );
    });

    it("handles empty messages list gracefully", () => {
      const emptyTranscript: GuestChatTranscript = {
        ...sampleTranscript,
        messages: [],
      };
      const md = service.formatConversationMarkdown(emptyTranscript);
      expect(md).toBe(
        "## Tao Ren & Livia Varro — Conversation\n\n*No messages recorded.*",
      );
    });
  });

  describe("formatConversationHtml", () => {
    it("escapes special characters and replaces newlines in HTML export", () => {
      const specialTranscript: GuestChatTranscript = {
        ...sampleTranscript,
        messages: [
          {
            id: "m3",
            role: "user",
            content: "Hello <script>alert(1)</script> & welcome\nNext line",
            timestamp: 1700000003000,
          },
        ],
      };
      const html = service.formatConversationHtml(specialTranscript);
      expect(html).toContain(
        "&lt;script&gt;alert(1)&lt;/script&gt; &amp; welcome<br/>Next line",
      );
      expect(html).not.toContain("<script>");
    });
  });

  describe("copyConversation", () => {
    it("copies rich text & markdown to clipboard and displays success notification", async () => {
      const result = await service.copyConversation(sampleTranscript);
      expect(result).toBe(true);
      expect(mockClipboardService.copyHtmlAndText).toHaveBeenCalledWith(
        expect.stringContaining("<html>"),
        expect.stringContaining("## Tao Ren & Livia Varro — Conversation"),
      );
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Conversation copied to clipboard",
        "success",
      );
    });

    it("falls back to writeText if copyHtmlAndText is not available", async () => {
      const fallbackService = new CharacterChatExportService({
        clipboardService: {
          writeText: mockClipboardService.writeText,
        },
        notificationStore: mockNotificationStore,
        vault: mockVault,
      });

      const result = await fallbackService.copyConversation(sampleTranscript);
      expect(result).toBe(true);
      expect(mockClipboardService.writeText).toHaveBeenCalledWith(
        expect.stringContaining("## Tao Ren & Livia Varro — Conversation"),
      );
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Conversation copied to clipboard",
        "success",
      );
    });

    it("handles clipboard failure and displays error notification", async () => {
      mockClipboardService.copyHtmlAndText = vi.fn().mockResolvedValue(false);
      const result = await service.copyConversation(sampleTranscript);
      expect(result).toBe(false);
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Failed to copy conversation to clipboard",
        "error",
      );
    });
  });

  describe("sendConversationToJournal", () => {
    it("creates a new note entity with 'journal' label, connections, and selects it", async () => {
      const entityId =
        await service.sendConversationToJournal(sampleTranscript);
      expect(entityId).toBe("new-note-id");
      expect(mockVault.createEntity).toHaveBeenCalledWith(
        "note",
        "Tao Ren & Livia Varro — Conversation",
        {
          labels: ["journal"],
          content: expect.stringContaining(
            "## Tao Ren & Livia Varro — Conversation",
          ),
          connections: [
            {
              target: "char-1",
              type: "related_to",
              strength: 1,
              label: "Conversation",
            },
            {
              target: "char-2",
              type: "related_to",
              strength: 1,
              label: "Conversation",
            },
          ],
        },
      );
      expect(mockVault.selectedEntityId).toBe("new-note-id");
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Saved conversation to Journal",
        "success",
      );
    });

    it("does not navigate to created entity if navigateToCreated is false", async () => {
      const entityId = await service.sendConversationToJournal(
        sampleTranscript,
        { navigateToCreated: false },
      );
      expect(entityId).toBe("new-note-id");
      expect(mockVault.selectedEntityId).toBeNull();
    });

    it("handles vault creation failure gracefully", async () => {
      mockVault.createEntity = vi
        .fn()
        .mockRejectedValue(new Error("Disk error"));
      const entityId =
        await service.sendConversationToJournal(sampleTranscript);
      expect(entityId).toBeNull();
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Failed to save journal entry",
        "error",
      );
    });

    it("returns null if vault is not provided", async () => {
      const noVaultService = new CharacterChatExportService({
        vault: undefined,
        notificationStore: mockNotificationStore,
      });
      const entityId =
        await noVaultService.sendConversationToJournal(sampleTranscript);
      expect(entityId).toBeNull();
      expect(mockNotificationStore.notify).toHaveBeenCalledWith(
        "Vault is unavailable to save journal entry",
        "error",
      );
    });
  });
});
