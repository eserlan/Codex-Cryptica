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
});
