/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { initGraph } from '../src/index';

describe('Graph Engine', () => {
  it('should initialize a cytoscape instance', () => {
    // Mock container
    const container = document.createElement('div');

    const cy = initGraph({
      headless: true,
      elements: [
        { data: { id: 'a' } },
        { data: { id: 'b' } },
        { data: { id: 'ab', source: 'a', target: 'b' } }
      ]
    });

    expect(cy).toBeDefined();
    expect(cy.elements().length).toBe(3);
    expect(cy.nodes().length).toBe(2);
    expect(cy.edges().length).toBe(1);

    cy.destroy();
  });
});
