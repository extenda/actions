import path from 'path';
import { vi } from 'vitest';

// 1. Shared State
const { proxyState } = vi.hoisted(() => ({
  proxyState: { useMemfs: false },
}));

// 2. Flatten helper (No changes)
function flatten(input, base = process.cwd()) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    const fullPath = path.resolve(base, key);
    if (typeof value === 'string' || Buffer.isBuffer(value)) {
      output[fullPath] = value;
    } else if (typeof value === 'object') {
      Object.assign(output, flatten(value, fullPath));
    }
  }
  return output;
}

// 3. Mock 'mock-fs'
vi.mock('mock-fs', async () => {
  const { vol } = await import('memfs');
  const nodeFs = await import('node:fs');
  const os = await import('node:os'); // Import os

  const mock = (config = {}) => {
    proxyState.useMemfs = true;
    vol.reset();

    const flatConfig = flatten(config);
    vol.fromJSON(flatConfig);

    try {
      vol.mkdirSync(process.cwd(), { recursive: true });
    } catch {
      // Ignore errors
    }
    try {
      vol.mkdirSync(os.tmpdir(), { recursive: true });
    } catch {
      // Ignore errors
    }
  };

  mock.restore = () => {
    proxyState.useMemfs = false;
    vol.reset();
  };

  mock.load = (filePath) => {
    try {
      return nodeFs.readFileSync(filePath, 'utf-8');
    } catch {
      return `<Error loading ${filePath}>`;
    }
  };

  return { default: mock };
});

// 4. Proxy Factory
async function createFsProxy(moduleName) {
  const actual = await vi.importActual(moduleName);
  const { fs: memfs } = await import('memfs');
  const exports = { ...actual };

  // Helper to determine implementation
  const getImpl = (key) => {
    // If mocking is OFF, use Real FS
    if (!proxyState.useMemfs) return actual[key];

    // If mocking is ON, use Memfs...
    if (key in memfs) return memfs[key];

    // ...BUT if Memfs is missing the method, THROW (Don't leak to disk!)
    return () => {
      throw new Error(
        `❌ Test Error: Method 'fs.${key}' is not supported by memfs, and we blocked a real disk write.`,
      );
    };
  };

  // Wrap every method
  for (const key of Object.keys(actual)) {
    if (typeof actual[key] === 'function') {
      exports[key] = function (...args) {
        return getImpl(key).apply(this, args);
      };
    }
  }

  // Wrap default export
  exports.default = new Proxy(actual.default, {
    get: (_, prop) => getImpl(prop),
  });

  return exports;
}

// 5. Apply Mocks
vi.mock('node:fs', () => createFsProxy('node:fs'));
vi.mock('fs', () => createFsProxy('fs'));
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises');
  const { fs: memfs } = await import('memfs');
  return new Proxy(actual, {
    get(target, prop) {
      if (proxyState.useMemfs && memfs.promises[prop]) {
        return memfs.promises[prop];
      }
      return Reflect.get(target, prop);
    },
  });
});
