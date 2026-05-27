/**
 * Bun Test Preload - Environment Polyfills and Svelte 5 Rune Shims
 */

// 1. FileReader Shim (needed for packages/importer)
if (typeof globalThis.FileReader === "undefined") {
  class MockFileReader extends EventTarget {
    onload: ((this: MockFileReader, ev: ProgressEvent) => any) | null = null;
    onerror: ((this: MockFileReader, ev: ProgressEvent) => any) | null = null;
    result: string | ArrayBuffer | null = null;

    readAsText(blob: Blob) {
      blob
        .text()
        .then((text) => {
          this.result = text;
          const event = new Event("load") as ProgressEvent;
          Object.defineProperty(event, "target", {
            value: this,
            writable: false,
          });
          if (this.onload) this.onload(event);
        })
        .catch((_err) => {
          const event = new Event("error") as ProgressEvent;
          Object.defineProperty(event, "target", {
            value: this,
            writable: false,
          });
          if (this.onerror) this.onerror(event);
        });
    }

    readAsArrayBuffer(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          const event = new Event("load") as ProgressEvent;
          Object.defineProperty(event, "target", {
            value: this,
            writable: false,
          });
          if (this.onload) this.onload(event);
        })
        .catch((_err) => {
          const event = new Event("error") as ProgressEvent;
          Object.defineProperty(event, "target", {
            value: this,
            writable: false,
          });
          if (this.onerror) this.onerror(event);
        });
    }
  }

  (globalThis as any).FileReader = MockFileReader;
}

// 2. DOMMatrix Shim (needed for pdfjs-dist in packages/importer tests)
if (typeof globalThis.DOMMatrix === "undefined") {
  class MockDOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
  }

  (globalThis as any).DOMMatrix = MockDOMMatrix;
}

// 3. Svelte 5 Runes Shim (needed for vault-engine, canvas-engine, oracle-engine)
const stateShim = (init: unknown) => init;
(stateShim as any).snapshot = (init: unknown) => init;

(globalThis as any).$state = stateShim;
(globalThis as any).$derived = (fn: () => unknown) =>
  typeof fn === "function" ? fn() : fn;
(globalThis as any).$derived.by = (fn: () => unknown) => fn();
(globalThis as any).$effect = () => {};
(globalThis as any).$effect.pre = () => {};
(globalThis as any).$effect.active = () => false;
(globalThis as any).$effect.root = (fn: () => unknown) => fn();
(globalThis as any).$props = () => ({});
(globalThis as any).$bindable = () => {};
(globalThis as any).$inspect = () => {};

// 4. Minimal DOM document Shim (needed for packages/graph-engine and others)
if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    createElement: () => ({
      appendChild: () => {},
      style: {},
    }),
  } as any;
}
