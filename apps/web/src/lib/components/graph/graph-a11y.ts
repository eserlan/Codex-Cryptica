/**
 * Text alternatives for the graph canvas.
 *
 * Cytoscape paints nodes and edges into a `<canvas>`, so there is no DOM for
 * assistive technology to walk: no node is focusable, nameable, or reachable.
 * Rather than mirroring graph state into a hidden DOM tree (which drifts from
 * cytoscape the moment layout, filters, or focus view change), the canvas is
 * marked `aria-hidden` and these strings carry its meaning instead:
 *
 *  - `buildGraphSummary` describes the view once, statically, and names the
 *    equivalent paths that *are* operable (the entity table, search).
 *  - `buildSelectionAnnouncement` feeds the single polite live region, so a
 *    selection made by any means (search, table, canvas click) is spoken.
 *
 * Kept as pure functions so the wording is unit-testable without mounting
 * cytoscape, matching the `mobile-entry.ts` split.
 */

export interface GraphSummaryInput {
  /** Entities in the vault, before focus-view culling or filters. */
  totalEntities: number;
  /** Connections in the vault, before focus-view culling or filters. */
  totalConnections: number;
  /** Entities actually drawn right now. */
  renderedEntities: number;
  /** Large-vault focus view is culling the graph to a subset. */
  focusViewActive: boolean;
  /** Category, label, or timeline filters are narrowing the graph. */
  filtersActive: boolean;
}

/**
 * Sentences for the graph's visually hidden description, in reading order.
 * Returned as an array so the caller renders one paragraph each and tests can
 * assert on individual claims.
 */
export function buildGraphSummary(input: GraphSummaryInput): string[] {
  const {
    totalEntities,
    totalConnections,
    renderedEntities,
    focusViewActive,
    filtersActive,
  } = input;

  if (totalEntities === 0) {
    return [
      "This graph is empty. Create an entity to begin, then connect it to another to draw your first relationship.",
    ];
  }

  const lines = [
    `Knowledge graph, drawn on a canvas: ${plural(totalEntities, "entity", "entities")} and ${plural(totalConnections, "connection", "connections")}.`,
  ];

  if (focusViewActive && renderedEntities < totalEntities) {
    lines.push(
      `This is a large vault, so only ${renderedEntities} of the ${totalEntities} entities are drawn. Choose Show full graph to draw all of them.`,
    );
  } else if (filtersActive && renderedEntities < totalEntities) {
    lines.push(
      `Filters are active: ${renderedEntities} of the ${totalEntities} entities are drawn.`,
    );
  }

  lines.push(
    "The drawing itself is not readable by a screen reader. Choose Browse as table for the same entities as a sortable list of links, where each entity's page lists its connections and their direction. Press Control K, or Command K on a Mac, to search for an entity by name and open it.",
  );

  return lines;
}

/**
 * The message announced when graph selection changes. Returns an empty string
 * when nothing is selected, so clearing a selection stays silent rather than
 * announcing an unhelpful "nothing selected" over whatever the user did next.
 */
export function buildSelectionAnnouncement(
  entity: { title?: string; type?: string } | null | undefined,
  connectionCount: number,
): string {
  if (!entity?.title) return "";
  const type = entity.type ? `${entity.type}, ` : "";
  return `Selected ${entity.title}, ${type}${plural(connectionCount, "connection", "connections")}.`;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
