import type { GuestChatTranscript, Entity, Connection } from "schema";
import { clipboardService as defaultClipboardService } from "$lib/services/ClipboardService";
import { notificationStore as defaultNotificationStore } from "$lib/stores/ui/notification.svelte";
import { vault as defaultVault } from "$lib/stores/vault.svelte";

export interface CharacterChatExportOptions {
  speakerName?: string;
  characterTitle?: string;
  navigateToCreated?: boolean;
}

export interface CharacterChatExportDependencies {
  clipboardService?: {
    copyHtmlAndText?: (html: string, text: string) => Promise<boolean>;
    writeText?: (text: string) => Promise<void>;
  };
  notificationStore?: {
    notify: (message: string, type?: "success" | "info" | "error") => void;
  };
  vault?: {
    entities: Record<string, Entity>;
    createEntity: (
      type: "note",
      title: string,
      initialData?: Partial<Entity>,
    ) => Promise<string>;
    selectedEntityId: string | null;
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class CharacterChatExportService {
  private clipboardService: CharacterChatExportDependencies["clipboardService"];
  private notificationStore: CharacterChatExportDependencies["notificationStore"];
  private vault: CharacterChatExportDependencies["vault"];

  constructor(deps: CharacterChatExportDependencies = {}) {
    this.clipboardService =
      "clipboardService" in deps
        ? deps.clipboardService
        : defaultClipboardService;
    this.notificationStore =
      "notificationStore" in deps
        ? deps.notificationStore
        : defaultNotificationStore;
    this.vault = "vault" in deps ? deps.vault : defaultVault;
  }

  resolveSpeakerName(
    transcript: GuestChatTranscript,
    overrideSpeaker?: string,
  ): string {
    if (overrideSpeaker?.trim()) {
      return overrideSpeaker.trim();
    }
    if (transcript.speakerCharacterId && this.vault?.entities) {
      const speakerEntity = this.vault.entities[transcript.speakerCharacterId];
      if (speakerEntity?.title) {
        return speakerEntity.title;
      }
    }
    if (transcript.guestName?.trim()) {
      return transcript.guestName.trim();
    }
    return "You";
  }

  resolveCharacterTitle(
    transcript: GuestChatTranscript,
    overrideTitle?: string,
  ): string {
    if (overrideTitle?.trim()) {
      return overrideTitle.trim();
    }
    if (transcript.characterTitle?.trim()) {
      return transcript.characterTitle.trim();
    }
    if (transcript.characterId && this.vault?.entities) {
      const charEntity = this.vault.entities[transcript.characterId];
      if (charEntity?.title) {
        return charEntity.title;
      }
    }
    return "Character";
  }

  formatConversationMarkdown(
    transcript: GuestChatTranscript,
    options?: CharacterChatExportOptions,
  ): string {
    const speakerName = this.resolveSpeakerName(
      transcript,
      options?.speakerName,
    );
    const characterTitle = this.resolveCharacterTitle(
      transcript,
      options?.characterTitle,
    );

    const title = `## ${speakerName} & ${characterTitle} — Conversation`;

    if (!transcript.messages || transcript.messages.length === 0) {
      return `${title}\n\n*No messages recorded.*`;
    }

    const dialogueLines = transcript.messages.map((message) => {
      const speaker = message.role === "user" ? speakerName : characterTitle;
      return `**${speaker}:** ${message.content.trim()}`;
    });

    return `${title}\n\n${dialogueLines.join("\n\n")}`;
  }

  formatConversationHtml(
    transcript: GuestChatTranscript,
    options?: CharacterChatExportOptions,
  ): string {
    const speakerName = this.resolveSpeakerName(
      transcript,
      options?.speakerName,
    );
    const characterTitle = this.resolveCharacterTitle(
      transcript,
      options?.characterTitle,
    );

    const escapedSpeaker = escapeHtml(speakerName);
    const escapedCharacter = escapeHtml(characterTitle);
    const escapedHeading = `${escapedSpeaker} &amp; ${escapedCharacter} — Conversation`;

    if (!transcript.messages || transcript.messages.length === 0) {
      return `<html><body><h2>${escapedHeading}</h2><p><em>No messages recorded.</em></p></body></html>`;
    }

    const dialogueHtml = transcript.messages
      .map((message) => {
        const speaker =
          message.role === "user" ? escapedSpeaker : escapedCharacter;
        const formattedContent = escapeHtml(message.content.trim()).replace(
          /\n/g,
          "<br/>",
        );
        return `<p><strong>${speaker}:</strong> ${formattedContent}</p>`;
      })
      .join("\n");

    return `<html><body><h2>${escapedHeading}</h2>\n${dialogueHtml}</body></html>`;
  }

  async copyConversation(
    transcript: GuestChatTranscript,
    options?: CharacterChatExportOptions,
  ): Promise<boolean> {
    const markdown = this.formatConversationMarkdown(transcript, options);
    const html = this.formatConversationHtml(transcript, options);

    let success = false;
    if (this.clipboardService?.copyHtmlAndText) {
      success = await this.clipboardService.copyHtmlAndText(html, markdown);
    } else if (this.clipboardService?.writeText) {
      try {
        await this.clipboardService.writeText(markdown);
        success = true;
      } catch (e) {
        console.error("[CharacterChatExport] Failed to copy to clipboard:", e);
        success = false;
      }
    }

    if (success) {
      this.notificationStore?.notify(
        "Conversation copied to clipboard",
        "success",
      );
    } else {
      this.notificationStore?.notify(
        "Failed to copy conversation to clipboard",
        "error",
      );
    }

    return success;
  }

  async sendConversationToJournal(
    transcript: GuestChatTranscript,
    options?: CharacterChatExportOptions,
  ): Promise<string | null> {
    if (!this.vault) {
      console.error("[CharacterChatExport] Vault store is unavailable");
      this.notificationStore?.notify(
        "Vault is unavailable to save journal entry",
        "error",
      );
      return null;
    }

    const speakerName = this.resolveSpeakerName(
      transcript,
      options?.speakerName,
    );
    const characterTitle = this.resolveCharacterTitle(
      transcript,
      options?.characterTitle,
    );

    const title = `${speakerName} & ${characterTitle} — Conversation`;
    const content = this.formatConversationMarkdown(transcript, options);

    const connections: Connection[] = [];
    const seenTargets = new Set<string>();

    if (transcript.characterId) {
      connections.push({
        target: transcript.characterId,
        type: "related_to",
        strength: 1,
        label: "Conversation",
      });
      seenTargets.add(transcript.characterId);
    }

    if (
      transcript.speakerCharacterId &&
      !seenTargets.has(transcript.speakerCharacterId)
    ) {
      connections.push({
        target: transcript.speakerCharacterId,
        type: "related_to",
        strength: 1,
        label: "Conversation",
      });
      seenTargets.add(transcript.speakerCharacterId);
    }

    try {
      const entityId = await this.vault.createEntity("note", title, {
        labels: ["journal"],
        content,
        connections,
      });

      if (options?.navigateToCreated !== false) {
        this.vault.selectedEntityId = entityId;
      }

      this.notificationStore?.notify(
        "Saved conversation to Journal",
        "success",
      );
      return entityId;
    } catch (err) {
      console.error(
        "[CharacterChatExport] Failed to create journal entry:",
        err,
      );
      this.notificationStore?.notify("Failed to save journal entry", "error");
      return null;
    }
  }
}

export const characterChatExportService = new CharacterChatExportService();
