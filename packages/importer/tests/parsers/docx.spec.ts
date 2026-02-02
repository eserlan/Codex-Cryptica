import { describe, it, expect, vi } from 'vitest';
import { DocxParser } from '../../src/parsers/docx';
import * as mammoth from 'mammoth';

// Mock mammoth
vi.mock('mammoth', () => ({
  convertToHtml: vi.fn(),
  images: {
    inline: vi.fn().mockImplementation((handler) => handler)
  }
}));

// Mock turndown since it is a default export dynamically imported
vi.mock('turndown', () => {
  return {
    default: class {
      turndown(html: string) {
        return html.replace(/<[^>]*>?/gm, ''); // Simple mock text extraction
      }
    }
  };
});

describe('DocxParser', () => {
  const parser = new DocxParser();

  it('accepts docx files', () => {
    const file = new File([''], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(parser.accepts(file)).toBe(true);
  });

  it('parses docx content', async () => {
    const file = new File([''], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Mock mammoth response
    (mammoth.convertToHtml as any).mockResolvedValue({
      value: '<p>Hello <strong>World</strong></p>',
      messages: []
    });

    const result = await parser.parse(file);
    
    // Since our mock turndown just strips tags, we expect "Hello World"
    expect(result.text).toContain('Hello World');
  });
});
