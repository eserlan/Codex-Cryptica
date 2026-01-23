import { describe, it, expect } from 'vitest';
import { EntitySchema } from './entity';

describe('Entity Schema Validation', () => {
  it('should validate a correct entity', () => {
    const validEntity = {
      id: 'npc-1',
      type: 'npc',
      title: 'Valid NPC',
      tags: ['test'],
      connections: [
        { target: 'loc-1', type: 'located_in', strength: 1 }
      ],
      content: 'Some content'
    };

    const result = EntitySchema.safeParse(validEntity);
    expect(result.success).toBe(true);
  });

  it('should reject invalid entity types', () => {
    const invalidEntity = {
      id: 'npc-2',
      type: 'invalid-type',
      title: 'Invalid',
    };

    const result = EntitySchema.safeParse(invalidEntity);
    expect(result.success).toBe(false);
  });
});
