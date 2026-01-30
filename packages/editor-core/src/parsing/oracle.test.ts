
import { describe, it, expect } from 'vitest';
import { parseOracleResponse } from './oracle';

describe('parseOracleResponse', () => {
    it('should handle empty or null input', () => {
        expect(parseOracleResponse('')).toEqual({
            chronicle: '',
            lore: '',
            wasSplit: false,
            method: 'none'
        });
        // @ts-ignore
        expect(parseOracleResponse(null)).toEqual({
            chronicle: '',
            lore: '',
            wasSplit: false,
            method: 'none'
        });
    });

    it('should split based on markdown headers (Strategy 1)', () => {
        const input = `
## Chronicle
This is a short summary.

## Lore
This is the detailed history.
It spans multiple lines.
    `;

        const result = parseOracleResponse(input);
        expect(result.wasSplit).toBe(true);
        expect(result.method).toBe('markers');
        expect(result.chronicle).toBe('This is a short summary.');
        expect(result.lore).toBe('This is the detailed history.\nIt spans multiple lines.');
    });

    it('should handle markers with colons', () => {
        const input = `
## Chronicle:
Summary here.

## Lore:
Detail here.
    `;
        const result = parseOracleResponse(input);
        expect(result.chronicle).toBe('Summary here.');
        expect(result.lore).toBe('Detail here.');
    });

    it('should handle order independence', () => {
        const input = `
## Lore
This is detail.

## Chronicle
This is summary.
    `;
        const result = parseOracleResponse(input);
        expect(result.chronicle).toBe('This is summary.');
        expect(result.lore).toBe('This is detail.');
    });

    it('should handle bold and colons as markers', () => {
        const input = `**Chronicle:** Short blurb.
**Lore:** Long history.`;
        const result = parseOracleResponse(input);
        expect(result.wasSplit).toBe(true);
        expect(result.chronicle).toBe('Short blurb.');
        expect(result.lore).toBe('Long history.');
    });

    it('should treat preamble as Chronicle if followed by Lore marker', () => {
        const input = `Shadow Blades are secret.
## Lore:
They were founded in 1200...`;
        const result = parseOracleResponse(input);
        expect(result.chronicle).toBe('Shadow Blades are secret.');
        expect(result.lore).toBe('They were founded in 1200...');
    });

    it('should fallback to single newline split for long text', () => {
        const input = "Very long title of some subgroup\nThis text is very long and detailed and should be at least three hundred characters long to trigger the single newline fallback mechanism which I am testing right now to make sure that even without double newlines we still get a split if the text is substantial enough to warrant a separate lore entry while keeping the first line as the chronicle summery which is often a title or name.".repeat(1);
        const result = parseOracleResponse(input);
        expect(result.wasSplit).toBe(true);
        expect(result.method).toBe('heuristic');
        expect(result.chronicle).toBe('Very long title of some subgroup');
    });

    it('should use heuristic fallback for unstructured text (Strategy 2)', () => {
        const input = `First paragraph is summary.

Second paragraph is detail.
Third paragraph is also detail.`;

        const result = parseOracleResponse(input);
        expect(result.wasSplit).toBe(true);
        expect(result.method).toBe('heuristic');
        expect(result.chronicle).toBe('First paragraph is summary.');
        expect(result.lore).toBe('Second paragraph is detail.\nThird paragraph is also detail.');
    });

    it('should treat single block as Lore if no split possible', () => {
        const input = `Just one long block of text.`;
        const result = parseOracleResponse(input);
        expect(result.wasSplit).toBe(false);
        expect(result.method).toBe('none');
        expect(result.chronicle).toBe('');
        expect(result.lore).toBe('Just one long block of text.');
    });
});
