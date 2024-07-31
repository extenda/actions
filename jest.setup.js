const mock = { fs: jest.requireActual('fs') };

/**
 * Calling require("mock-fs") will make jest
 *   return memfs.fs for further calls to require("fs")
*/
jest.mock('mock-fs', () => {
  const memfs = jest.requireActual('memfs');
  const os = jest.requireActual('os');

  mock.fs = memfs.fs;

  return Object.assign((volume = { }) => {
    memfs.vol.reset();
    memfs.vol.fromNestedJSON(volume);
    memfs.vol.mkdirSync('.', { recursive: true });
    memfs.vol.mkdirSync('/tmp', { recursive: true });
    memfs.vol.mkdirSync(os.tmpdir(), { recursive: true });
  }, { restore: () => {} });
});

jest.mock('fs', () => mock.fs);
