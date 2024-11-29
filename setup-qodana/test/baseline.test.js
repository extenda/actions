const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { root, createFiles, removeFiles } = require('./test-files');
const findBaseline = require('../src/baseline');

afterEach(() => {
  removeFiles();
});

test('It can find qodana.sarif.json', async () => {
  createFiles(['README.md', 'qodana.sarif.json']);
  const baseline = await findBaseline(root);
  expect(baseline).toEqual('qodana.sarif.json');
});

test('It uses first qodana.sarif.json', async () => {
  createFiles([
    'README.md',
    '.qodana/qodana.sarif.json',
    'src/qodana.sarif.json',
  ]);
  const baseline = await findBaseline(root);
  expect(baseline).toEqual('.qodana/qodana.sarif.json');
});

test('It handles missing baseline', async () => {
  createFiles(['README.md']);
  const baseline = await findBaseline(root);
  expect(baseline).toBeFalsy();
});

test('It can decompress a qodana.sarif.json.gz', async () => {
  createFiles(['README.md']);
  const gzipFile = path.resolve(root, 'qodana.sarif.json.gz');
  const gzip = zlib.createGzip();
  const output = fs.createWriteStream(gzipFile);
  gzip.pipe(output);
  gzip.write('my-content');
  gzip.end();
  await new Promise((resolve) => output.on('finish', resolve));

  expect(fs.existsSync(gzipFile)).toEqual(true);

  const baseline = await findBaseline(root);
  expect(baseline).toEqual('qodana.sarif.json');
  expect(
    fs.readFileSync(path.resolve(root, 'qodana.sarif.json'), 'utf-8'),
  ).toEqual('my-content');
});

test('It prioritizes qodana.sarif.json over json.gz', async () => {
  createFiles(['qodana.sarif.json.gz', 'subdir/qodana.sarif.json']);
  const baseline = await findBaseline(root);
  expect(baseline).toEqual('subdir/qodana.sarif.json');
});

test('It can find managed-qodana.sarif.json', async () => {
  createFiles(['README.md', 'managed-qodana.sarif.json']);
  const baseline = await findBaseline(root);
  expect(baseline).toEqual('managed-qodana.sarif.json');
});
