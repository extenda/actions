
jest.mock('axios');
jest.mock('@actions/core');
jest.mock('../../gcp-secret-manager/src/secrets');

const axios = require('axios');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const notifySlack = require('../src/slack-notify');

describe('send Message to slack', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Can send message without channel', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    await notifySlack('service-account', 'text', '');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(2);
  });

  test('Can send message with channel', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    await notifySlack('service-account', 'text', 'channel-name');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });

  test('Error on request', async () => {
    axios.mockRejectedValueOnce({ status: 500 });
    await notifySlack('service-account', 'text', 'channel-name');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });
});
