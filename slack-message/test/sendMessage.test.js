jest.mock('../../utils');
jest.mock('../../gcp-secret-manager/src/secrets');
jest.mock('@actions/core');

const sendMessage = require('../src/sendMessage');
const { loadGitHubToken } = require('../../utils/src');


describe('send Message to slack', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Can send message', async () => {
    sendMessage('title', 'text', 'fallback');
    expect(loadGitHubToken).toHaveBeenCalledTimes(1);
  });
});
