import yaml from 'js-yaml';
import type { Entity, Connection } from 'schema';

export interface ParseResult {
  metadata: Partial<Entity>;
  content: string;
  wikiLinks: Connection[];
}

export function parseMarkdown(raw: string): ParseResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = raw.match(frontmatterRegex);

  let metadata: Partial<Entity> = {};
  let content = raw;

  if (match) {
    try {
      const yamlContent = match[1];
      const parsed = yaml.load(yamlContent) as any;
      if (typeof parsed === 'object' && parsed !== null) {
        metadata = parsed;
      }
    } catch (e) {
      console.error('Failed to parse frontmatter', e);
    }
    content = raw.replace(frontmatterRegex, '').trim();
  }

  // Extract Wiki Links from content: [[Target]] or [[Target|Label]]
  const wikiLinks = extractWikiLinks(content);

  return { metadata, content, wikiLinks };
}

export function extractWikiLinks(content: string): Connection[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const matches = content.matchAll(regex);
  const connections: Connection[] = [];

  for (const match of matches) {
    const target = match[1].trim();
    const label = match[2]?.trim();

    // Sanitize ID (basic version)
    const targetId = sanitizeId(target);

    connections.push({
      target: targetId,
      type: 'related_to', // Default type for inline links
      label: label || target,
      strength: 1
    });
  }

  return connections;
}

export function sanitizeId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function stringifyEntity(entity: Entity): string {
  const { content, ...metadata } = entity;
  // Remove runtime-only fields if they crept in
  const cleanMetadata = { ...metadata };
  delete (cleanMetadata as any)._fsHandle;
  delete (cleanMetadata as any)._lastModified;
  delete (cleanMetadata as any).connections;

  (cleanMetadata as any).connections = entity.connections;

  const yamlStr = yaml.dump(cleanMetadata);
  return `---\n${yamlStr}---\n${content || ''}`;
}