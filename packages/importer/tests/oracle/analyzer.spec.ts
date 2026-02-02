import { describe, it, expect, vi } from 'vitest';
import { OracleAnalyzer } from '../../src/oracle/analyzer';

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

describe('OracleAnalyzer', () => {
  const apiKey = 'test-key';
  const analyzer = new OracleAnalyzer(apiKey);

  it('analyzes text and returns entities', async () => {
    const mockResponse = JSON.stringify([
      {
        title: 'Hero',
        type: 'Character',
        content: '# Hero\nA brave warrior.',
        frontmatter: { class: 'Warrior' },
        detectedLinks: ['Sword']
      }
    ]);

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockResponse
      }
    });

    const result = await analyzer.analyze('Hero is a brave warrior who wields the Sword.');

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].suggestedTitle).toBe('Hero');
    expect(result.entities[0].suggestedFilename).toBe('hero.md'); // Auto-slug check
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('handles empty response gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '[]'
      }
    });

    const result = await analyzer.analyze('Nothing here.');
    expect(result.entities).toHaveLength(0);
  });

  it('extracts JSON from noisy response (markdown fences, filler text)', async () => {
    const noisyResponse = `
    Here is the analysis:
    \`\`\`json
    [
      {
        "title": "Noise Test",
        "type": "note",
        "content": "Testing robust extraction"
      }
    ]
    \`\`\`
    Hope this helps!
    `;

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => noisyResponse
      }
    });

    const result = await analyzer.analyze('Some text');

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].suggestedTitle).toBe('Noise Test');
  });
});
