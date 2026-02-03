import type { DiscoveredEntity } from './types';

export function generateMarkdownFile(entity: DiscoveredEntity): string {
  const frontmatter: Record<string, any> = {
    title: entity.suggestedTitle,
    type: entity.suggestedType,
    ...entity.frontmatter
  };

  // Include detected links in the frontmatter so they aren't lost
  if (entity.detectedLinks && entity.detectedLinks.length > 0) {
    frontmatter.detectedLinks = entity.detectedLinks;
  }

  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      const items = value.map(v => {
        if (typeof v === 'object' && v !== null) {
          // Simple key-value pairing for connection objects
          return `{ ${Object.entries(v).map(([sk, sv]) => `${sk}: "${String(sv).replace(/"/g, '\\"')}"`).join(', ')} }`;
        }
        return `"${v}"`;
      });
      return `${key}: [${items.join(', ')}]`;
    }
    if (typeof value === 'string' && (value.includes(':') || value.includes('\n'))) {
      return `${key}: "${value.replace(/"/g, '\\"')}"`;
    }
    return `${key}: ${value}`;
  });

  return `---
${yamlLines.join('\n')}
---

${entity.content}`;
}

export async function saveAssetToOpfs(asset: { id: string, blob: Blob, originalName: string }): Promise<string> {
  // Mock OPFS persistence for MVP or use browser API
  // In a real app, this would use the Origin Private File System API
  // For this library, we might just return the logic or delegate.
  // We'll implement a basic interface placeholder.
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(asset.originalName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(asset.blob);
  await writable.close();
  return asset.originalName;
}

