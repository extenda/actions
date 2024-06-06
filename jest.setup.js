/* eslint-disable global-require */

const memfs = require('memfs');

const mockFs = function mock(volume = { }) {
  memfs.vol.reset();
  memfs.vol.fromJSON(volume);
  memfs.vol.mkdirSync('.', { recursive: true });
};

mockFs.restore = function restore() {};

jest.mock('mock-fs', () => mockFs);
jest.mock('fs', () => require('memfs').fs);
