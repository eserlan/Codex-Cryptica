import { beforeEach, describe, expect, it, vi } from "vitest";
import { VaultTranscripts } from "./transcripts";
import {
  loadTranscriptsForCharacterFromDisk,
  saveTranscriptToDisk,
} from "./io";
import type { GuestChatTranscript } from "schema";

vi.mock("./io", () => ({
  saveTranscriptToDisk: vi.fn(),
  loadTranscriptsForCharacterFromDisk: vi.fn(),
}));

function setup() {
  const removeEntry = vi.fn();
  const getDirectoryHandle = vi.fn();
  const handle = { getDirectoryHandle, removeEntry };
  getDirectoryHandle.mockResolvedValue(handle);
  const vault = {
    isGuest: false,
    activeVaultId: "vault",
    getActiveVaultHandle: vi.fn().mockResolvedValue(handle),
  };
  return { store: new VaultTranscripts(vault), vault, handle, removeEntry };
}

beforeEach(() => vi.clearAllMocks());
describe("VaultTranscripts", () => {
  it("saves and loads transcripts against the current vault handle", async () => {
    const { store, handle } = setup();
    const transcript = { guestId: "guest" } as GuestChatTranscript;
    vi.mocked(loadTranscriptsForCharacterFromDisk).mockResolvedValue([
      transcript,
    ]);
    await store.saveTranscript(transcript);
    expect(saveTranscriptToDisk).toHaveBeenCalledWith(
      handle,
      "vault",
      transcript,
    );
    expect(await store.loadTranscriptsForCharacter("hero")).toEqual([
      transcript,
    ]);
    expect(loadTranscriptsForCharacterFromDisk).toHaveBeenCalledWith(
      handle,
      "hero",
    );
  });

  it("does not save or delete as a guest, or without a handle or vault id", async () => {
    const { store, vault, removeEntry } = setup();
    vault.isGuest = true;
    await store.saveTranscript({} as GuestChatTranscript);
    await store.deleteTranscript("guest", "hero");
    expect(vault.getActiveVaultHandle).not.toHaveBeenCalled();
    vault.isGuest = false;
    vault.activeVaultId = "";
    await store.saveTranscript({} as GuestChatTranscript);
    vault.activeVaultId = "vault";
    vault.getActiveVaultHandle.mockResolvedValue(undefined);
    await store.saveTranscript({} as GuestChatTranscript);
    await store.deleteTranscript("guest", "hero");
    expect(await store.loadTranscriptsForCharacter("hero")).toEqual([]);
    expect(saveTranscriptToDisk).not.toHaveBeenCalled();
    expect(removeEntry).not.toHaveBeenCalled();
  });

  it("deletes the matching file and tolerates a missing transcript", async () => {
    const { store, handle, removeEntry } = setup();
    await store.deleteTranscript("guest", "hero");
    expect(handle.getDirectoryHandle).toHaveBeenNthCalledWith(1, ".codex", {
      create: true,
    });
    expect(handle.getDirectoryHandle).toHaveBeenNthCalledWith(
      2,
      "transcripts",
      { create: true },
    );
    expect(removeEntry).toHaveBeenCalledWith("guest_hero.json");
    removeEntry.mockRejectedValueOnce(new Error("missing"));
    await expect(
      store.deleteTranscript("guest", "hero"),
    ).resolves.toBeUndefined();
  });
});
