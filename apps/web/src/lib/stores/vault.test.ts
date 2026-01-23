import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vault } from './vault.svelte';
import * as fsUtils from '../utils/fs';

// Mock dependencies
vi.mock('../utils/fs', () => ({
  walkDirectory: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock global window.showDirectoryPicker
// @ts-ignore
global.window = global.window || {};
// @ts-ignore
global.window.showDirectoryPicker = vi.fn();

describe('VaultStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vault.entities = new Map();
  });

  it('should initialize with empty state', () => {
    expect(vault.entities.size).toBe(0);
    expect(vault.status).toBe('idle');
  });

  it('should load files from directory', async () => {
    // Mock FS response
    const mockFiles = [
      { handle: {}, path: ['test.md'] }
    ];
    vi.mocked(fsUtils.walkDirectory).mockResolvedValue(mockFiles as any);

    // Use simple string without complex newlines to be safe, or template literal
    vi.mocked(fsUtils.readFile).mockResolvedValue(`---
id: test
title: Test Node
type: npc
---
Content`);

    // Mock directory picker
    const mockHandle = {};
    // @ts-ignore
    (window.showDirectoryPicker as any).mockResolvedValue(mockHandle);

    await vault.openDirectory();

    expect(vault.status).toBe('idle');
    expect(vault.entities.size).toBe(1);

    const entity = vault.entities.get('test');
    expect(entity).toBeDefined();
    expect(entity?.title).toBe('Test Node');
  });

  it('should create new entity', async () => {
    // Mock getFileHandle and writeFile
    const mockFileHandle = { createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) };
    vault.rootHandle = { getFileHandle: vi.fn().mockResolvedValue(mockFileHandle) } as any;

    const id = await vault.createEntity('npc', 'New Hero');
    expect(id).toBe('new-hero');
    expect(vault.entities.has(id)).toBe(true);
    expect(vault.entities.get(id)?.title).toBe('New Hero');
  });

  it('should update entity and schedule save', async () => {
    vi.useFakeTimers();
    const mockFileHandle = { createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) };
    const entity = { id: 'test', title: 'Test', _fsHandle: mockFileHandle } as any;
    vault.entities.set('test', entity);

    vault.updateEntity('test', { title: 'Updated' });

    expect(vault.entities.get('test')?.title).toBe('Updated');

    // Fast-forward debounce timer
    vi.runAllTimers();

    expect(fsUtils.writeFile).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should delete entity', async () => {
    const mockFileHandle = { kind: 'file' };
    const mockRootHandle = { removeEntry: vi.fn() };
    vault.rootHandle = mockRootHandle as any;

    vault.entities.set('test', {
      id: 'test',
      _fsHandle: mockFileHandle,
      _path: ['test.md']
    } as any);

    await vault.deleteEntity('test');

    expect(mockRootHandle.removeEntry).toHaveBeenCalledWith('test.md');
    expect(vault.entities.has('test')).toBe(false);
  });

  it('should parse wiki-links with labels correctly', async () => {
    const mockFiles = [{ handle: {}, path: ['test.md'] }];
    vi.mocked(fsUtils.walkDirectory).mockResolvedValue(mockFiles as any);
    vi.mocked(fsUtils.readFile).mockResolvedValue(`---
id: test
---
Link to [[Other|The Label]]`);

    // @ts-ignore
    window.showDirectoryPicker.mockResolvedValue({});
    await vault.openDirectory();

    const entity = vault.entities.get('test');
    expect(entity?.connections).toContainEqual({
      target: 'other',
      type: 'related_to',
      label: 'The Label',
      strength: 1
    });
  });
});