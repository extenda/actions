jest.mock('@actions/exec');
const exec = require('@actions/exec');
const getImageDigest = require('../src/image-digest');

const mockExecListeners = (output) => (cmd, args, opts) => {
  opts.listeners.stdout(Buffer.from(output, 'utf8'));
  return Promise.resolve(0);
};

test('Get image digest', async () => {
  const image = 'eu.gcr.io/my-image:tag123';
  const digest = 'djdq1787';
  exec.exec.mockImplementationOnce(mockExecListeners(digest));

  expect(await getImageDigest(image)).toEqual('eu.gcr.io/my-image@djdq1787');
  expect(exec.exec).toHaveBeenCalledTimes(1);
});
