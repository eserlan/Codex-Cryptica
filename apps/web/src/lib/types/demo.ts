/**
 * Interface for Demo Mode operations.
 */
export interface IDemoActions {
  /**
   * Activates Demo Mode with a specific theme.
   * Loads sample data and bypasses landing page.
   */
  startDemo(theme: string): Promise<void>;

  /**
   * Persists the current transient demo state to IndexedDB.
   * Returns the new vault ID.
   */
  convertToCampaign(): Promise<string>;

  /**
   * Exits demo mode and reloads the previous campaign or returns to landing.
   */
  exitDemo(): void;
}

/**
 * Marketing metadata for theme-specific demos.
 */
export interface DemoMetadata {
  theme: string;
  title: string;
  marketingPrompt: string; // e.g., "Build your Vampire lore"
  sampleDataUrl: string;
}
