/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CharacterChat from "./CharacterChat.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    transcripts: {},
    isGenerating: false,
    startChat: vi.fn(),
    sendMessage: vi.fn(),
    saveMessageEdit: vi.fn(),
    deleteMessage: vi.fn(),
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

  it("lets a host start a character chat once it is enabled", async () => {
    render(CharacterChat, { entity: character });

    await fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(guestChatStore.startChat).toHaveBeenCalledWith(
      "char-1",
      "Mara the Blacksmith",
    );
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
});
