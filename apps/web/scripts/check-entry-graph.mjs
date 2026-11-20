/**
 * Post-build script: report what the `/` route loads up front and fail if
 * anything on the denylist is on that path.
 *
 * `/` is served by `routes/(app)/+page.svelte`, so the entry graph is the
 * start/app entries plus the root layout, the `(app)` layout and the `(app)`
 * page nodes. Which node numbers those are is read from the route dictionary
 * in the built `app.js`, never hard-coded. Only static `imports` are
 * followed; `dynamicImports` are loaded on demand and so are fine.
 *
 * The modules inside each chunk come from the chunk's source map (`sources`).
 * Workers built from `?worker` imports are only referenced by URL string
 * (`workers/<name>-<hash>.js`), never by manifest `imports`, so they are found
 * by matching that string in the chunk code.
 *
 * Reads an existing build, builds nothing. Run in `apps/web` after
 * `vite build` (the `build` script does this). The pure functions are
 * exported for check-entry-graph.test.js; everything below the direct-run
 * guard is a thin CLI wrapper.
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Patterns (substrings) that must not appear in the entry graph of `/`, as a
 * module path or a worker file. To keep something else off `/`, add it here.
 */
export const ENTRY_GRAPH_DENYLIST = ["oracle.worker", "proposer.worker"];

const MANIFEST_PATH = ".svelte-kit/output/client/.vite/manifest.json";
const WORKER_REF = /workers\/[\w.-]+-[\w-]+\.js/g;

/** Strips the `../` prefixes a source map puts in front of repo paths. */
export function normalizeSource(source) {
  return source.replace(/^(\.\.\/)+/, "");
}

/** The built `app.js` manifest entry (holds the route dictionary). */
export function findAppEntry(manifest) {
  return Object.values(manifest).find(
    (item) => item.isEntry && /\/app\.js$/.test(item.src ?? ""),
  );
}

/**
 * Manifest keys of the entries that serve `/`: the files under `entry/`
 * (start, app) and the root layout, `(app)` layout and `(app)` page nodes.
 */
export function findRootEntryKeys(manifest, appCode) {
  const route = /"\/\(app\)":\[(\d+),\[([\d,]*)\]/.exec(appCode);
  if (!route) {
    throw new Error('Could not find the "/(app)" route in the built app.js');
  }
  const nodeIndexes = new Set([0, Number(route[1])]);
  for (const n of route[2].split(",").filter(Boolean)) {
    nodeIndexes.add(Number(n));
  }
  const keys = [];
  for (const [key, item] of Object.entries(manifest)) {
    if (!item.isEntry) continue;
    const node = /\/nodes\/(\d+)\.js$/.exec(item.src ?? "");
    if (item.file.startsWith("_app/immutable/entry/")) {
      keys.push(key);
    } else if (node && nodeIndexes.has(Number(node[1]))) {
      keys.push(key);
    }
  }
  return keys;
}

/** Every manifest key reachable from `startKeys` through static `imports`. */
export function collectStaticClosure(manifest, startKeys) {
  const seen = new Set();
  const queue = [...startKeys];
  while (queue.length > 0) {
    const key = queue.pop();
    if (seen.has(key)) continue;
    const item = manifest[key];
    if (!item) {
      throw new Error(`Manifest has no entry for imported chunk "${key}"`);
    }
    seen.add(key);
    queue.push(...(item.imports ?? []));
  }
  return seen;
}

/**
 * Walks the entry graph. `readText(file)` returns a build file's text relative
 * to `_app`'s parent (the build dir), or null when it does not exist.
 */
export function analyzeEntryGraph({ manifest, readText }) {
  const appItem = findAppEntry(manifest);
  if (!appItem) throw new Error("Manifest has no app.js entry");
  const appCode = readText(appItem.file);
  if (appCode === null) throw new Error(`Missing build file ${appItem.file}`);

  const keys = collectStaticClosure(
    manifest,
    findRootEntryKeys(manifest, appCode),
  );
  const chunks = [];
  const modules = new Map(); // module -> chunk files
  const workers = new Map(); // worker file -> chunk files
  const add = (map, name, chunk) => {
    map.set(name, [...(map.get(name) ?? []), chunk]);
  };

  for (const key of keys) {
    const { file } = manifest[key];
    if (!file.endsWith(".js")) continue;
    chunks.push(file);
    const code = readText(file);
    if (code === null) throw new Error(`Missing build file ${file}`);
    // Rollup emits no map for some tiny helper chunks; they list no modules.
    const map = readText(`${file}.map`);
    for (const source of map === null ? [] : (JSON.parse(map).sources ?? [])) {
      add(modules, normalizeSource(source), file);
    }
    for (const ref of new Set(code.match(WORKER_REF) ?? [])) {
      add(workers, ref, file);
    }
  }
  chunks.sort();
  return { chunks, modules, workers };
}

/** One message per denylisted module or worker on the graph. */
export function findViolations(graph, denylist = ENTRY_GRAPH_DENYLIST) {
  const violations = [];
  for (const [kind, map] of [
    ["module", graph.modules],
    ["worker", graph.workers],
  ]) {
    for (const [name, chunkFiles] of map) {
      const pattern = denylist.find((p) => name.includes(p));
      if (pattern) {
        violations.push(
          `Denylisted ${kind} "${name}" (matches "${pattern}") is on the entry graph of / in chunk ${chunkFiles.join(", ")}`,
        );
      }
    }
  }
  return violations;
}

/** Formats the printed listing. */
export function formatReport(graph) {
  return [
    `Chunks on the entry graph of / (${graph.chunks.length}):`,
    ...graph.chunks.map((c) => `  ${c}`),
    `Modules (${graph.modules.size}):`,
    ...[...graph.modules.keys()].sort().map((m) => `  ${m}`),
    `Workers (${graph.workers.size}):`,
    ...[...graph.workers.keys()].sort().map((w) => `  ${w}`),
  ].join("\n");
}

/**
 * Runs the check against a build. Returns `{ errors, report }`; `errors` is
 * empty when the build passes.
 */
export function checkEntryGraph({
  appDir,
  denylist = ENTRY_GRAPH_DENYLIST,
  exists = existsSync,
  read = (path) => readFileSync(path, "utf8"),
}) {
  const manifestPath = join(appDir, MANIFEST_PATH);
  const buildDir = join(appDir, "build");
  if (!exists(manifestPath)) {
    return {
      errors: [`Client manifest not found: ${manifestPath}`],
      report: "",
    };
  }
  if (!exists(buildDir)) {
    return { errors: [`Build output not found: ${buildDir}`], report: "" };
  }
  try {
    const graph = analyzeEntryGraph({
      manifest: JSON.parse(read(manifestPath)),
      readText: (file) => {
        const path = join(buildDir, file);
        return exists(path) ? read(path) : null;
      },
    });
    return {
      errors: findViolations(graph, denylist),
      report: formatReport(graph),
    };
  } catch (err) {
    return {
      errors: [err instanceof Error ? err.message : String(err)],
      report: "",
    };
  }
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  const { errors, report } = checkEntryGraph({
    appDir: resolve(dirname(__filename), ".."),
  });
  if (report) console.log(report);
  if (errors.length > 0) {
    for (const error of errors) console.error(`check-entry-graph: ${error}`);
    process.exit(1);
  }
  console.log("check-entry-graph: no denylisted modules or workers on /");
}
