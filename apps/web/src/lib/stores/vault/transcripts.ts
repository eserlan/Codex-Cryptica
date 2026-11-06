import type { GuestChatTranscript } from "schema";
import type { VaultStore } from "../vault.svelte";
import {
  saveTranscriptToDisk,
  loadTranscriptsForCharacterFromDisk,
} from "./io";

type TranscriptVault = Pick<
  VaultStore,
  "isGuest" | "activeVaultId" | "getActiveVaultHandle"
>;

export class VaultTranscripts {
  constructor(private vault: TranscriptVault) {}
  async saveTranscript(transcript: GuestChatTranscript) {
    if (this.vault.isGuest) return;
    if (!this.vault.activeVaultId) return;
    const vaultHandle = await this.vault.getActiveVaultHandle();
    if (!vaultHandle) return;
    await saveTranscriptToDisk(
      vaultHandle,
      this.vault.activeVaultId,
      transcript,
    );
  }

  async loadTranscriptsForCharacter(
    characterId: string,
  ): Promise<GuestChatTranscript[]> {
    const vaultHandle = await this.vault.getActiveVaultHandle();
    if (!vaultHandle) return [];
    return await loadTranscriptsForCharacterFromDisk(vaultHandle, characterId);
  }

  async deleteTranscript(guestId: string, characterId: string) {
    if (this.vault.isGuest) return;
    const vaultHandle = await this.vault.getActiveVaultHandle();
    if (!vaultHandle) return;
    try {
      const codexDir = await vaultHandle.getDirectoryHandle(".codex", {
        create: true,
      });
      const transcriptsDir = await codexDir.getDirectoryHandle("transcripts", {
        create: true,
      });
      await transcriptsDir.removeEntry(`${guestId}_${characterId}.json`);
    } catch (err) {
      console.warn("[VaultStore] Failed to delete transcript file:", err);
    }
  }
}
