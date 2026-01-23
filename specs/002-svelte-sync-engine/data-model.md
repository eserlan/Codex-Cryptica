# Data Model: Svelte-Native Sync Engine

## Core Entities

### 1. Entity (The "Atom")
Represents a single Markdown file in the vault.

*   **Source**: YAML Frontmatter + Markdown Body
*   **Schema (TypeScript)**:
    ```typescript
    type EntityId = string; // e.g., "npc-elara"
    type EntityType = 'npc' | 'location' | 'event' | 'item' | 'faction';

    interface Entity {
      id: EntityId;
      type: EntityType;
      title: string;
      content: string; // The raw Markdown body (excluding frontmatter)
      tags: string[];
      connections: Connection[];
      // File system metadata (not persisted in YAML, but needed for runtime)
      _fsHandle?: FileSystemFileHandle; 
      _lastModified?: number;
    }
    ```

### 2. Connection (The "Edge")
Represents a directed relationship between two entities.

*   **Source**: YAML `connections` array
*   **Schema (TypeScript)**:
    ```typescript
    interface Connection {
      target: EntityId; // The ID of the target entity
      type: string;     // e.g., "located_in", "knows"
      strength?: number; // 0.0 to 1.0
    }
    ```

## Derived Graph Model (Cytoscape)

### 3. GraphElement
The transform result consumed by Cytoscape.

*   **Source**: Derived from `Entity` and `Connection`
*   **Schema**:
    ```typescript
    type GraphElement = GraphNode | GraphEdge;

    interface GraphNode {
      group: 'nodes';
      data: {
        id: string;
        label: string;
        type: string; // Used for styling (color/shape)
        weight: number; // Derived from connection count
      };
      position?: { x: number; y: number }; // Optional: persisted layout positions
    }

    interface GraphEdge {
      group: 'edges';
      data: {
        id: string; // constructed: "${source}-${target}-${type}"
        source: string;
        target: string;
        label?: string;
        strength?: number;
      };
    }
    ```
