# Data Model: Design Guide and Styleguide

## Entities

### Design Pattern

A reusable solution to a common UI problem within the Codex-Cryptica ecosystem.

- **Name**: Unique identifier for the pattern (e.g., "Modal Dialog", "Lore Search").
- **Description**: Plain-text explanation of the problem it solves and the visual/behavioral goal.
- **Visual Spec**: Rules for colors, typography, and spacing (using Tailwind 4 tokens).
- **Behavioral Spec**: Rules for interactivity (e.g., "Closes on ESC", "Transitions using Svelte fade").

### Component Guideline

Specific implementation rules for an individual Svelte 5 component.

- **Component Name**: The name of the Svelte component (e.g., `Button.svelte`).
- **Props Schema**: Definition of required and optional properties ($props).
- **State Management**: Explanation of local reactive state ($state) and derived values ($derived).
- **Example Usage**: A static Markdown code snippet demonstrating the component in a standard scenario.

## Relationships

- A **Design Pattern** may be implemented by one or more **Components**.
- A **Component Guideline** belongs to exactly one Svelte component file.
