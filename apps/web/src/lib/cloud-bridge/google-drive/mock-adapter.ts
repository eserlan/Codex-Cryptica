import type { ICloudAdapter, RemoteFileMeta } from "../index";

export class MockDriveAdapter implements ICloudAdapter {
  private connected = false;
  private files: Map<string, RemoteFileMeta> = new Map();
  private userEmail = "mock-user@example.com";

  constructor(initialFiles: Record<string, RemoteFileMeta> = {}) {
    for (const [path, meta] of Object.entries(initialFiles)) {
      this.files.set(path, meta);
    }
  }

  async connect(): Promise<string> {
    this.connected = true;
    return this.userEmail;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listFiles(): Promise<RemoteFileMeta[]> {
    this.checkConnected();
    return Array.from(this.files.values());
  }

  async uploadFile(
    path: string,
    content: string | Blob,
    existingId?: string,
  ): Promise<RemoteFileMeta> {
    this.checkConnected();
    const id = existingId || `mock-file-${Date.now()}`;
    const meta: RemoteFileMeta = {
      id,
      name: path.split("/").pop() || path,
      mimeType:
        typeof content === "string" ? "text/markdown" : "application/json",
      modifiedTime: new Date().toISOString(),
      parents: ["mock-folder-id"],
      appProperties: {
        vault_path: path,
      },
    };
    this.files.set(path, meta);
    return meta;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    this.checkConnected();
    // Simulate finding content by ID
    return new Blob([`Mock content for file ${fileId}`], { type: "text/plain" });
  }

  async deleteFile(fileId: string): Promise<void> {
    this.checkConnected();
    for (const [path, meta] of this.files.entries()) {
      if (meta.id === fileId) {
        this.files.delete(path);
        break;
      }
    }
  }

  private checkConnected() {
    if (!this.connected) {
      throw new Error("MockDriveAdapter not connected");
    }
  }

  // Test helpers
  getMockFiles() {
    return this.files;
  }
}
