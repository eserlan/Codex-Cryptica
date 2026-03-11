export interface IOracleCommandParser {
  /**
   * Identify the intent from raw user input.
   * Does NOT perform any side effects.
   */
  parse(query: string, liteMode: boolean): OracleIntent;

  /**
   * Detects if the user wants an image generated.
   */
  detectImageIntent(query: string): boolean;

  /**
   * Checks for keywords indicating an expanded lore drop.
   */
  isExpandRequest(query: string): boolean;
}
