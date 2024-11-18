const { root, createFiles, removeFiles } = require('./test-files');
const findBaseline = require('../src/baseline');

afterEach(() => {
  removeFiles();
});

test('It can find qodana.sarif.json', () => {
  createFiles(['README.md', 'qodana.sarif.json']);
  const baseline = findBaseline(root);
  expect(baseline).toEqual('qodana.sarif.json');
});

test('It uses first qodana.sarif.json', () => {
  createFiles([
    'README.md',
    '.qodana/qodana.sarif.json',
    'src/qodana.sarif.json',
  ]);
  const baseline = findBaseline(root);
  expect(baseline).toEqual('.qodana/qodana.sarif.json');
});

test('It handles missing baseline', () => {
  createFiles(['README.md']);
  const baseline = findBaseline(root);
  expect(baseline).toBeFalsy();
});
