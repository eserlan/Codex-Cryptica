/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("./VTTChatMessage.svelte", () => ({
  default: function VTTChatMessageMock() {
    return {};
  },
}));

vi.mock("$lib/components/oracle/CommandMenu.svelte", () => ({
  default: function CommandMenuMock() {
    return {};
  },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    chatMessages: [],
    sendChatMessage: vi.fn(),
  },
}));

import VTTChat from "./VTTChat.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

describe("VTTChat", () => {
  it("submits slash roll commands through the VTT session chat", async () => {
    render(VTTChat);

    const input = screen.getByPlaceholderText("Type a message...");
    await fireEvent.input(input, { target: { value: "/roll 1d20" } });
    await fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mapSession.sendChatMessage).toHaveBeenCalledWith("/roll 1d20");
  });

  it("shows the command hint above the input", () => {
    render(VTTChat);

    expect(screen.getByPlaceholderText("Type a message...")).not.toBeNull();
    expect(screen.getByText("/")).not.toBeNull();
  });

  it("opens the shared dice modal from the input row button", async () => {
    render(VTTChat);

    await fireEvent.click(
      screen.getByRole("button", { name: "Open Dice Roller" }),
    );

    expect(modalUIStore.showDiceModal).toBe(true);
  });
});
