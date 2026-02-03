const mock = { fs: await import('fs') };

/**
 * Calling import("mock-fs") will make jest
 *   return memfs.fs for further calls to import("fs")
*/
jest.mock('mock-fs', async () => {
  const memfs = await import('memfs');
  const os = await import('os');

  mock.fs = memfs.fs;

  return Object.assign((volume = {}) => {
    memfs.vol.reset();
    memfs.vol.fromNestedJSON(volume);
    memfs.vol.mkdirSync('.', { recursive: true });
    memfs.vol.mkdirSync('/tmp', { recursive: true });
    memfs.vol.mkdirSync(os.default.tmpdir(), { recursive: true });
  }, { restore: () => {} });
});

jest.mock('fs', () => mock.fs);
