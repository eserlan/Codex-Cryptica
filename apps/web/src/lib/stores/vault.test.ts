// apps/web/src/lib/stores/vault.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vault } from './vault.svelte';

vi.mock('../utils/opfs', () => {
	const mockDir = {
		getDirectoryHandle: vi.fn().mockResolvedValue({
			getFileHandle: vi.fn().mockResolvedValue({
				getFile: vi.fn().mockResolvedValue({
					text: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`),
					lastModified: 1
				})
			})
		}),
		values: vi.fn().mockImplementation(async function* () {
			yield {
				kind: 'file',
				name: 'test.md',
				getFile: () => Promise.resolve({
					text: () => Promise.resolve(`---
id: test
title: Test
---
`), lastModified: 1
				})
			};
		}),
		entries: vi.fn().mockImplementation(async function* () {
			yield ['test.md', {
				kind: 'file',
				getFile: () => Promise.resolve({
					text: () => Promise.resolve(`---
id: test
title: Test
---
`), lastModified: 1
				})
			}];
		})
	};

	return {
		getOpfsRoot: vi.fn().mockResolvedValue(mockDir),
		getVaultDir: vi.fn().mockResolvedValue(mockDir),
		createVaultDir: vi.fn().mockResolvedValue(mockDir),
		deleteVaultDir: vi.fn().mockResolvedValue(undefined),
		getOrCreateDir: vi.fn().mockResolvedValue(mockDir),
		walkOpfsDirectory: vi.fn().mockResolvedValue([
			{
				handle: {
					getFile: vi.fn().mockResolvedValue({
						text: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`),
						lastModified: 1
					})
				},
				path: ['test.md']
			}
		]),
		writeOpfsFile: vi.fn(),
		readOpfsBlob: vi.fn(),
		deleteOpfsEntry: vi.fn(),
		readFileAsText: vi.fn().mockResolvedValue(`---
id: test
title: Test
---
`)
	};
});

vi.mock('../services/search', () => ({
	searchService: {
		clear: vi.fn(),
		index: vi.fn()
	}
}));

vi.mock('../services/cache', () => ({
	cacheService: {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn()
	}
}));

vi.mock('./debug.svelte', () => ({
	debugStore: {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn()
	}
}));

describe('VaultStore (OPFS)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vault.entities = {};
	});

	it('should initialize and load files from OPFS', async () => {
		await vault.init();
		expect(Object.keys(vault.entities).length).toBe(1);
		expect(vault.entities['test']?.title).toBe('Test');
	});

	it('should create a new entity in OPFS', async () => {
		await vault.createEntity('character', 'New Character');
		expect(Object.keys(vault.entities).length).toBe(1);
		expect(vault.entities['new-character']?.title).toBe('New Character');
	});
});
