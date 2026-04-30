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

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

(global as any).localStorage = localStorageMock;
(global as any).sessionStorage = sessionStorageMock;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
}

// Also mock Storage class if it's used for prototype spying
if (typeof Storage === "undefined") {
  (global as any).Storage = class Storage {};
}
// Link prototype methods to our mock methods so spies on Storage.prototype work
const proto = (global as any).Storage.prototype;
proto.getItem = function (key: string) {
  return (
    this === localStorage ? localStorageMock : sessionStorageMock
  ).getItem(key);
};
proto.setItem = function (key: string, value: string) {
  (this === localStorage ? localStorageMock : sessionStorageMock).setItem(
    key,
    value,
  );
};
proto.removeItem = function (key: string) {
  (this === localStorage ? localStorageMock : sessionStorageMock).removeItem(
    key,
  );
};
proto.clear = function () {
  (this === localStorage ? localStorageMock : sessionStorageMock).clear();
};
proto.key = function (index: number) {
  return (this === localStorage ? localStorageMock : sessionStorageMock).key(
    index,
  );
};
Object.defineProperty(proto, "length", {
  get: function () {
    return (this === localStorage ? localStorageMock : sessionStorageMock)
      .length;
  },
  configurable: true,
});

// Force our mocks to inherit from Storage.prototype
Object.setPrototypeOf(localStorageMock, proto);
Object.setPrototypeOf(sessionStorageMock, proto);
