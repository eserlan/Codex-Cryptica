import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateMarkdownFile } from '../src/persistence';
import type { DiscoveredEntity } from '../src/types';

describe('Import Integration', () => {
    it('should generate valid markdown from t.json samples', () => {
        // Read the t.json file (relative to workspace root or adjusted for this test location)
        // packages/importer/tests/import-integration.spec.ts -> fixtures is in the same dir
        const jsonPath = resolve(__dirname, './fixtures/t.json');
        const rawData = JSON.parse(readFileSync(jsonPath, 'utf8'));

        // t.json is now pretty-printed as an array of entities directly 
        // (after my previous mv command)
        const entities = rawData;

        expect(entities.length).toBeGreaterThan(0);

        entities.forEach((item: any) => {
            const entity: DiscoveredEntity = {
                id: 'test-id',
                suggestedTitle: item.title,
                suggestedType: item.type,
                content: item.content,
                frontmatter: item.frontmatter,
                detectedLinks: item.detectedLinks,
                suggestedFilename: item.title.toLowerCase().replace(/ /g, '-'),
                confidence: 1
            };

            const markdown = generateMarkdownFile(entity);

            // Basic validation
            expect(markdown).toContain('---');
            expect(markdown).toContain(entity.content);

            // Check for title and type (allowing for potential quoting)
            expect(markdown.toLowerCase()).toContain('title:');
            expect(markdown.toLowerCase()).toContain(entity.suggestedTitle.toLowerCase().split(':')[0]); // Less strict match
            expect(markdown.toLowerCase()).toContain('type:');

            // Check for valid YAML markers (newlines)
            expect(markdown.startsWith('---\n')).toBe(true);
            expect(markdown.includes('\n---\n')).toBe(true);

            // Check for detectedLinks in frontmatter
            if (entity.detectedLinks && entity.detectedLinks.length > 0) {
                expect(markdown).toContain('detectedLinks: [');
            }
        });
    });
});
