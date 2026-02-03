import { describe, it, expect } from 'vitest';
import { parseOracleResponse } from '../src/parsing/oracle';

describe('Oracle Parser', () => {
    it('should extract title, type, and image from marked responses', () => {
        const input = `
# Name: Brandr the Captain
# Type: Character
# Image: https://cdn.midjourney.com/brandr.png
# Thumbnail: https://cdn.midjourney.com/brandr_thumb.png
# Connections: Elden, The Sea, Sigrid

## Chronicle
He is a fierce warrior.

## Lore
A long history of battles...
`;
        const result = parseOracleResponse(input);
        expect(result.title).toBe('Brandr the Captain');
        expect(result.type).toBe('character');
        expect(result.image).toBe('https://cdn.midjourney.com/brandr.png');
        expect(result.thumbnail).toBe('https://cdn.midjourney.com/brandr_thumb.png');
        expect(result.connections).toEqual(['Elden', 'The Sea', 'Sigrid']);
        expect(result.chronicle).toBe('He is a fierce warrior.');
        expect(result.wasSplit).toBe(true);
    });

    it('should handle different marker formats', () => {
        const input = `
**Title:** The Lost City
**Category:** Location
**ImageUrl:** https://example.com/city.jpg

## Chronicle
A city buried in sand.
`;
        const result = parseOracleResponse(input);
        expect(result.title).toBe('The Lost City');
        expect(result.type).toBe('location');
        expect(result.image).toBe('https://example.com/city.jpg');
    });

    it('should handle structured JSON responses from Gemini', () => {
        const input = `
{
    "title": "Benjamin Bowman",
    "type": "Character",
    "content": "Known as **The Egyptologist**...",
    "frontmatter": {
      "race": "Vampire",
      "image": "https://img.alchemyrpg.com/bowman.jpg"
    },
    "detectedLinks": [
      "The Coterie",
      "London"
    ]
}
`;
        const result = parseOracleResponse(input);
        expect(result.title).toBe('Benjamin Bowman');
        expect(result.type).toBe('character'); // normalized
        expect(result.image).toBe('https://img.alchemyrpg.com/bowman.jpg');
        expect(result.connections).toEqual(['The Coterie', 'London']);
    });
});
