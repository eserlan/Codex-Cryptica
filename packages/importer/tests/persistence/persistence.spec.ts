import { describe, it, expect, vi } from 'vitest';
import { generateMarkdownFile, saveAssetToOpfs } from '../../src/persistence';
import { DiscoveredEntity } from '../../src/types';

describe('Persistence', () => {
  it('generates valid markdown with frontmatter', () => {
    const entity: DiscoveredEntity = {
      id: '1',
      suggestedTitle: 'Hero',
      suggestedType: 'Character',
      content: 'A brave warrior.',
      frontmatter: { class: 'Warrior', level: 5 },
      confidence: 1,
      detectedLinks: []
    };

    const fileContent = generateMarkdownFile(entity);
    
    expect(fileContent).toContain('---');
    expect(fileContent).toContain('title: Hero');
    expect(fileContent).toContain('type: Character');
    expect(fileContent).toContain('class: Warrior');
    expect(fileContent).toContain('level: 5');
    expect(fileContent).toContain('A brave warrior.');
  });

  // Since OPFS is browser-only and requires complex mocking in JSDOM, 
  // we test the generator logic here.
});