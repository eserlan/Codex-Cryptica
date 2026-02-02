/**
 * Interface for the Orbit Layout functionality within the Graph Engine.
 * This defines how the UI interacts with the graph to trigger the layout.
 */
export interface OrbitLayoutManager {
  /**
   * Activates the Orbit Layout centered around a specific node.
   *
   * @param centralNodeId - The ID of the node to place at the center.
   * @returns Promise resolving when the layout animation completes.
   */
  setCentralNode(centralNodeId: string): Promise<void>;

  /**
   * Clears the Orbit Layout and restores the previous layout (or default).
   *
   * @returns Promise resolving when the restoration animation completes.
   */
  clearOrbit(): Promise<void>;

  /**
   * Checks if Orbit Mode is currently active.
   */
  isOrbitActive(): boolean;

  /**
   * Gets the current central node ID if active.
   */
  getCentralNodeId(): string | null;
}

/**
 * Events emitted by the Graph Engine related to Orbit Layout.
 */
export type OrbitEvents = {
  'orbit:start': { centralNodeId: string };
  'orbit:end': void;
};
