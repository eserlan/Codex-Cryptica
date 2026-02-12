// apps/web/src/lib/utils/opfs.ts
import { debugStore } from '$lib/stores/debug.svelte';

/**
 * Gets the root directory of the Origin Private File System.
 */
export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
	return await navigator.storage.getDirectory();
}

/**
 * Recursively walks an OPFS directory and returns a list of file entries.
 */
export async function walkOpfsDirectory(
	dirHandle: FileSystemDirectoryHandle,
	path: string[] = [],
	onError?: (err: unknown, path: string[]) => void
): Promise<FileEntry[]> {
	const entries: FileEntry[] = [];
	const SKIP_DIRS = new Set(['images']);

	try {
		for await (const handle of dirHandle.values()) {
			const name = handle.name;
			const currentPath = [...path, name];
			try {
				if (handle.kind === 'file') {
					if (name.endsWith('.md')) {
						entries.push({
							handle: handle as FileSystemFileHandle,
							path: currentPath
						});
					}
				} else if (handle.kind === 'directory') {
					if (SKIP_DIRS.has(name)) {
						continue;
					}
					const subEntries = await walkOpfsDirectory(
						handle as FileSystemDirectoryHandle,
						currentPath,
						onError
					);
					entries.push(...subEntries);
				}
			} catch (innerErr) {
				if (onError) onError(innerErr, currentPath);
			}
		}
	} catch (err) {
		if (onError) onError(err, path);
		debugStore.error('Failed to walk OPFS directory', { path, err });
		throw err;
	}

	return entries;
}

/**
 * Writes content to a file in OPFS.
 */
export async function writeOpfsFile(
	path: string[],
	content: string | Blob,
	baseHandle?: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle> {
	const root = baseHandle || (await getOpfsRoot());
	let currentDir = root;

	// Navigate to the target directory, creating subdirectories as needed
	for (let i = 0; i < path.length - 1; i++) {
		currentDir = await currentDir.getDirectoryHandle(path[i], { create: true });
	}

	const fileName = path[path.length - 1];
	const fileHandle = await currentDir.getFileHandle(fileName, { create: true });

	const writable = await fileHandle.createWritable();
	await writable.write(content);
	await writable.close();

	return fileHandle;
}

/**
 * Reads a file from OPFS.
 */
export async function readOpfsFile(
	path: string[],
	baseHandle?: FileSystemDirectoryHandle
): Promise<string> {
	const root = baseHandle || (await getOpfsRoot());
	let currentDir = root;

	for (let i = 0; i < path.length - 1; i++) {
		currentDir = await currentDir.getDirectoryHandle(path[i]);
	}

	const fileName = path[path.length - 1];
	const fileHandle = await currentDir.getFileHandle(fileName);
	const file = await fileHandle.getFile();
	return await file.text();
}

/**
 * Reads a file as a Blob from OPFS.
 */
export async function readOpfsBlob(
	path: string[],
	baseHandle?: FileSystemDirectoryHandle
): Promise<Blob> {
	const root = baseHandle || (await getOpfsRoot());
	let currentDir = root;

	for (let i = 0; i < path.length - 1; i++) {
		currentDir = await currentDir.getDirectoryHandle(path[i]);
	}

	const fileName = path[path.length - 1];
	const fileHandle = await currentDir.getFileHandle(fileName);
	const file = await fileHandle.getFile();
	return file;
}

export interface FileEntry {
	handle: FileSystemFileHandle;
	path: string[]; // Relative path from root
}
