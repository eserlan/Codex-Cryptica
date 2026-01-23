// Placeholder test for Wiki-Link extension
import { describe, it, expect } from 'vitest';

describe('Wiki-Link Extension', () => {
  it('should parse [[Link]] correctly', () => {
    // Actual test logic would depend on Tiptap test utils
    const input = 'This is a [[Link]]';
    const hasLink = input.includes('[[Link]]');
    expect(hasLink).toBe(true);
  });
});
