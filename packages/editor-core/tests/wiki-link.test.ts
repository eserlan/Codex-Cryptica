/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';

describe('WikiLink Detection Regex', () => {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]$/;

  it('should match [[Link]] at the end of a string', () => {
    const match = 'This is a [[Link]]'.match(wikiLinkRegex);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('Link');
  });

  it('should match links with spaces', () => {
    const match = 'Check out [[Deep Space]]'.match(wikiLinkRegex);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('Deep Space');
  });

  it('should not match malformed links', () => {
    expect('[[Link'.match(wikiLinkRegex)).toBeNull();
    expect('Link]]'.match(wikiLinkRegex)).toBeNull();
  });
});
