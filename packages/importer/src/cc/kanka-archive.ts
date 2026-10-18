import { unzipSync } from "fflate";

const MIN_KANKA_VERSION = [2, 1, 0] as const;
const MAX_KANKA_MAJOR = 3;
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_COUNT = 20_000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: false });

export type KankaJsonRecord = Record<string, unknown>;

export function isKankaRecord(value: unknown): value is KankaJsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asKankaString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function safeArchivePath(path: string): boolean {
  if (!path || path.length > 1024 || path.startsWith("/")) return false;
  if (path.includes("\\") || /^[A-Za-z]:/.test(path)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  return path
    .split("/")
    .every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );
}

function readArchive(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error(
      `This Kanka export is larger than the ${MAX_ARCHIVE_BYTES.toLocaleString()}-byte archive limit.`,
    );
  }

  let entries: Record<string, Uint8Array>;
  try {
    let fileCount = 0;
    let declaredTotalBytes = 0;
    entries = unzipSync(bytes, {
      filter: (file) => {
        if (file.name.endsWith("/")) return false;
        fileCount++;
        if (fileCount > MAX_FILE_COUNT) {
          throw new Error(`more than ${MAX_FILE_COUNT.toLocaleString()} files`);
        }
        if (file.originalSize > MAX_FILE_BYTES) {
          throw new Error(`"${file.name}" exceeds the per-file size limit`);
        }
        declaredTotalBytes += file.originalSize;
        if (declaredTotalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          throw new Error("the uncompressed contents exceed the archive limit");
        }
        return true;
      },
    });
  } catch (error) {
    throw new Error(
      `This Kanka ZIP could not be read: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    );
  }

  const files = new Map<string, Uint8Array>();
  let actualTotalBytes = 0;
  for (const [path, content] of Object.entries(entries)) {
    if (!safeArchivePath(path)) {
      throw new Error(`The Kanka ZIP contains an unsafe path: "${path}".`);
    }
    if (content.byteLength > MAX_FILE_BYTES) {
      throw new Error(`"${path}" exceeds the per-file size limit.`);
    }
    actualTotalBytes += content.byteLength;
    if (actualTotalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("The Kanka ZIP's uncompressed contents are too large.");
    }
    files.set(path, content);
  }
  return files;
}

export function parseKankaJson(
  bytes: Uint8Array,
  path: string,
): KankaJsonRecord {
  try {
    const value: unknown = JSON.parse(decoder.decode(bytes));
    if (!isKankaRecord(value)) throw new Error("root value is not an object");
    return value;
  } catch (error) {
    throw new Error(
      `Kanka export file "${path}" is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    );
  }
}

function readKankaVersion(files: Map<string, Uint8Array>): string {
  const markdown = files.get("info.md");
  if (markdown && markdown.byteLength > 0) {
    const match = decoder
      .decode(markdown)
      .match(/(?:^|\n)\s*kanka_version\s*[:=]\s*["']?([^\s"']+)/i);
    if (match?.[1]) return match[1];
  }

  const infoJson = files.get("info.json");
  if (infoJson && infoJson.byteLength > 0) {
    const version = asKankaString(
      parseKankaJson(infoJson, "info.json").kanka_version,
    );
    if (version) return version;
  }

  throw new Error(
    'This ZIP has no readable info.md or info.json with a "kanka_version" key, so it is not a supported Kanka JSON export.',
  );
}

function assertSupportedVersion(version: string): void {
  const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    throw new Error(
      `Kanka export version "${version}" is unknown or malformed.`,
    );
  }
  const parsed = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  const belowMinimum =
    parsed[0] < MIN_KANKA_VERSION[0] ||
    (parsed[0] === MIN_KANKA_VERSION[0] && parsed[1] < MIN_KANKA_VERSION[1]);
  if (belowMinimum || parsed[0] > MAX_KANKA_MAJOR) {
    throw new Error(
      `Kanka export version "${version}" is not supported. Supported exports are Kanka 2.1 through 3.x.`,
    );
  }
}

async function inputBytes(
  input: Blob | Uint8Array | ArrayBuffer,
): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

export async function readKankaArchive(
  input: Blob | Uint8Array | ArrayBuffer,
): Promise<{ files: Map<string, Uint8Array>; kankaVersion: string }> {
  const files = readArchive(await inputBytes(input));
  const kankaVersion = readKankaVersion(files);
  assertSupportedVersion(kankaVersion);
  return { files, kankaVersion };
}
