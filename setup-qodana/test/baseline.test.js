const { root, createFiles, removeFiles } = require('./test-files');
const findBaseline = require('../src/baseline');

afterEach(() => {
  removeFiles();
});

test('It can find baseline.sarif.json', () => {
  createFiles(['README.md', 'baseline.sarif.json']);
  const baseline = findBaseline(root);
  expect(baseline).toEqual('baseline.sarif.json');
});

test('It uses first baseline.sarif.json', () => {
  createFiles([
    'README.md',
    '.qodana/baseline.sarif.json',
    'src/baseline.sarif.json',
  ]);
  const baseline = findBaseline(root);
  expect(baseline).toEqual('.qodana/baseline.sarif.json');
});

test('It handles missing baseline', () => {
  createFiles(['README.md']);
  const baseline = findBaseline(root);
  expect(baseline).toBeFalsy();
});
