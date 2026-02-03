import { describe, it, expect } from 'vitest';
import { TextParser } from '../../src/parsers/text';

describe('TextParser', () => {
  const parser = new TextParser();

  it('accepts text files', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    expect(parser.accepts(file)).toBe(true);
  });

  it('accepts markdown files', () => {
    const file = new File(['# Title'], 'test.md', { type: 'text/markdown' });
    expect(parser.accepts(file)).toBe(true);
  });

  it('rejects binary files', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    expect(parser.accepts(file)).toBe(false);
  });

  it('parses text content correctly', async () => {
    const content = 'Hello World\nLine 2';
    const file = new File([content], 'test.txt', { type: 'text/plain' });
    const result = await parser.parse(file);
    
    expect(result.text).toBe(content);
    expect(result.assets).toHaveLength(0);
    expect(result.metadata).toEqual({});
  });
});
