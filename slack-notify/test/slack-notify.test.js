jest.mock('axios');
jest.mock('@actions/core');
jest.mock('../../gcp-secret-manager/src/secrets');
jest.mock('form-data');
jest.mock('fs');

const axios = require('axios');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const notifySlack = require('../src/slack-notify');

describe.skip('send Message to slack', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Can send message without channel', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    await notifySlack('service-account', 'text', '', '');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(2);
  });

  test('Can send message with channel', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    await notifySlack('service-account', 'text', 'channel-name', '');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });

  test('Error on request without file', async () => {
    axios.mockRejectedValueOnce({ status: 500 });
    await notifySlack('service-account', 'text', 'channel-name', '');
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });

  test('It throws on missing file', async () => {
    axios.mockRejectedValueOnce({ status: 500 });
    await expect(notifySlack('service-account', 'text', 'channel-name', 'file'))
      .rejects.toThrow('File not found: file');
    expect(axios).not.toHaveBeenCalled();
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });

  test('Can send message with file', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    const result = await notifySlack('service-account', 'text', 'channel', 'reportFile');
    expect(result).toEqual(true);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });
});
