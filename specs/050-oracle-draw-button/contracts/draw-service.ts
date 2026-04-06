/**
 * Interface for triggering AI visualization actions.
 * Implemented by OracleStore.
 */
export interface IDrawActions {
  /**
   * Generates an image for a specific entity using its lore and global art style.
   * Automatically saves the resulting image to the vault.
   */
  drawEntity(entityId: string): Promise<void>;

  /**
   * Generates an image based on the content of a specific chat message.
   * Displays the resulting image inline within the chat.
   */
  drawMessage(messageId: string): Promise<void>;
}

/**
 * Visual feedback for style grounding.
 */
export interface StyleFeedback {
  activeStyleTitle?: string;
  isApplied: boolean;
}
