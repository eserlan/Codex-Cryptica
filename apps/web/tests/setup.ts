import "fake-indexeddb/auto";

// Fix Worker is not defined in jsdom environment
class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

if (typeof window !== "undefined") {
  (window as any).Worker = MockWorker;
}
(global as any).Worker = MockWorker;

// Robust Storage mock that works with vi.spyOn(Storage.prototype, ...)
// Use a WeakMap to store data per Storage instance
const storageData = new WeakMap<any, Map<string, string>>();

const getStore = (instance: any) => {
  if (!storageData.has(instance)) {
    storageData.set(instance, new Map());
  }
  return storageData.get(instance)!;
};

// Ensure Storage class exists
if (typeof Storage === "undefined") {
  (global as any).Storage = class Storage {
    get length() {
      return getStore(this).size;
    }
    clear() {
      getStore(this).clear();
    }
    getItem(key: string) {
      // Correctly return null ONLY if key is missing, not if it's an empty string
      const store = getStore(this);
      return store.has(key) ? store.get(key)! : null;
    }
    key(index: number) {
      return Array.from(getStore(this).keys())[index] || null;
    }
    removeItem(key: string) {
      getStore(this).delete(key);
    }
    setItem(key: string, value: string) {
      getStore(this).set(key, String(value));
    }
  };
} else {
  // If Storage exists (e.g. in jsdom), override prototype methods to ensure consistency
  // and remove any shadowed own-properties if they exist.
  Storage.prototype.getItem = function (key: string) {
    const store = getStore(this);
    return store.has(key) ? store.get(key)! : null;
  };
  Storage.prototype.setItem = function (key: string, value: string) {
    getStore(this).set(key, String(value));
  };
  Storage.prototype.removeItem = function (key: string) {
    getStore(this).delete(key);
  };
  Storage.prototype.clear = function () {
    getStore(this).clear();
  };
  Storage.prototype.key = function (index: number) {
    return Array.from(getStore(this).keys())[index] || null;
  };
  Object.defineProperty(Storage.prototype, "length", {
    get: function () {
      return getStore(this).size;
    },
    configurable: true,
  });
}

// Create/Ensure localStorage and sessionStorage are proper Storage instances
if (typeof window !== "undefined") {
  const ensureStorage = (name: "localStorage" | "sessionStorage") => {
    let instance = (window as any)[name];
    if (!instance || !(instance instanceof Storage)) {
      instance = Object.create(Storage.prototype);
      Object.defineProperty(window, name, {
        value: instance,
        writable: true,
        configurable: true,
      });
    } else {
      // Remove own properties that might shadow the prototype
      delete (instance as any).getItem;
      delete (instance as any).setItem;
      delete (instance as any).removeItem;
      delete (instance as any).clear;
      delete (instance as any).key;
      delete (instance as any).length;
    }
    return instance;
  };

  const ls = ensureStorage("localStorage");
  const ss = ensureStorage("sessionStorage");
  (global as any).localStorage = ls;
  (global as any).sessionStorage = ss;
} else {
  (global as any).localStorage = new Storage();
  (global as any).sessionStorage = new Storage();
}
