/**
 * CanvasEngine API Contract
 *
 * Defines the public interface for the @codex/canvas-engine package.
 */

export interface CanvasService {
  /**
   * Load a canvas from a JSON string or buffer.
   */
  load(data: string): Promise<void>;

  /**
   * Export the current canvas state to a JSON-serializable object.
   */
  export(): any;

  /**
   * Add a new node to the canvas.
   * @param entityId The ID of the vault entity.
   * @param position X and Y coordinates.
   */
  addNode(entityId: string, position: { x: number; y: number }): string;

  /**
   * Remove a node and its associated links.
   */
  removeNode(nodeId: string): void;

  /**
   * Create a connection between two existing nodes.
   */
  addLink(sourceId: string, targetId: string, label?: string): string;

  /**
   * Update node metadata (position, dimensions).
   */
  updateNode(
    nodeId: string,
    updates: Partial<{
      position: { x: number; y: number };
      width: number;
      height: number;
    }>,
  ): void;

  /**
   * Undo/Redo stack management (optional but recommended for UX).
   */
  undo(): void;
  redo(): void;
}
