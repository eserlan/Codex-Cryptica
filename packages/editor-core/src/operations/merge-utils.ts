export interface IConnection {
  source: string;
  target: string;
  label: string;
}

export interface INodeContent {
  id: string;
  frontmatter: Record<string, any>;
  body: string;
  connections: IConnection[];
}

export interface IMergedContentProposal {
  targetId: string;
  suggestedFrontmatter: Record<string, any>;
  suggestedBody: string;
  incomingConnections: IConnection[];
  outgoingConnections: IConnection[];
}

/**
 * Merges the frontmatter of multiple nodes into one.
 * Conflict resolution strategy:
 * - Arrays: Concatenated and deduplicated.
 * - Scalars: Target node value takes precedence. New values from sources are added.
 */
export function mergeFrontmatter(
  targetContent: INodeContent,
  sourceContents: INodeContent[],
): Record<string, any> {
  const merged = { ...targetContent.frontmatter };

  for (const source of sourceContents) {
    const sourceFm = source.frontmatter;
    for (const key in sourceFm) {
      if (Object.prototype.hasOwnProperty.call(sourceFm, key)) {
        const targetValue = merged[key];
        const sourceValue = sourceFm[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
          // Merge arrays and deduplicate
          merged[key] = Array.from(new Set([...targetValue, ...sourceValue]));
        } else if (targetValue === undefined) {
          // Add new scalar if missing in target
          merged[key] = sourceValue;
        }
        // If targetValue exists and is scalar, keep it (target wins)
      }
    }
  }

  return merged;
}

/**
 * Concatenates the body of multiple nodes.
 */
export function concatenateBody(
  targetContent: INodeContent,
  sourceContents: INodeContent[],
): string {
  const bodies = [targetContent.body];
  for (const source of sourceContents) {
    if (source.body.trim()) {
      bodies.push(source.body);
    }
  }
  return bodies.join("\n\n---\n\n");
}
