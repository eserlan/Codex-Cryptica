/**
 * In-memory directory handle used only by tests. Implements the small slice of
 * the File System Access API that the template repository reads.
 */
export class FakeDir {
  kind = "directory" as const;
  dirs = new Map<string, FakeDir>();
  files = new Map<string, string>();

  constructor(public name = "root") {}

  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    let dir = this.dirs.get(name);
    if (!dir) {
      if (!opts?.create) throw notFound(name);
      dir = new FakeDir(name);
      this.dirs.set(name, dir);
    }
    return dir;
  }

  async getFileHandle(name: string) {
    const text = this.files.get(name);
    if (text === undefined) throw notFound(name);
    return {
      kind: "file" as const,
      name,
      getFile: async () => ({ text: async () => text }),
    };
  }

  async *entries() {
    for (const [name, dir] of this.dirs) yield [name, dir] as const;
    for (const name of this.files.keys()) {
      yield [name, await this.getFileHandle(name)] as const;
    }
  }

  private dirAt(parts: string[], create: boolean): FakeDir | undefined {
    if (parts.length === 0) return this;
    const [head, ...rest] = parts;
    let next = this.dirs.get(head);
    if (!next && create) {
      next = new FakeDir(head);
      this.dirs.set(head, next);
    }
    return next?.dirAt(rest, create);
  }

  /** Test helper: create nested directories and write a file. */
  put(path: string[], text: string): this {
    this.dirAt(path.slice(0, -1), true)!.files.set(path[path.length - 1], text);
    return this;
  }

  /** Test helper: read a file by path, or undefined. */
  read(path: string[]): string | undefined {
    return this.dirAt(path.slice(0, -1), false)?.files.get(
      path[path.length - 1],
    );
  }

  remove(path: string[]): void {
    this.dirAt(path.slice(0, -1), false)?.files.delete(path[path.length - 1]);
  }
}

function notFound(name: string) {
  const err = new Error(`${name} not found`);
  err.name = "NotFoundError";
  return err;
}

export const asHandle = (d: FakeDir) =>
  d as unknown as FileSystemDirectoryHandle;
