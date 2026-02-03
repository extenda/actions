import axios from 'axios';
import path from 'path';

import { loadSecret } from '../../gcp-secret-manager/src/secrets.js';
import notifySlack from '../src/slack-notify.js';
import uploadToBucket from '../src/upload-to-bucket.js';

jest.mock('axios');
jest.mock('@actions/core');
jest.mock('../../gcp-secret-manager/src/secrets.js');
jest.mock('../src/upload-to-bucket', () => jest.fn());

describe('send Message to slack', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    loadSecret.mockResolvedValue('secret');
    uploadToBucket.mockResolvedValue();
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
    await expect(
      notifySlack(
        'service-account',
        'text',
        'channel-name',
        'missing-file.txt',
      ),
    ).rejects.toThrow('File not found: missing-file.txt');
    expect(axios).not.toHaveBeenCalled();
    expect(uploadToBucket).not.toHaveBeenCalled();
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });

  test('Can send message with file', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    const result = await notifySlack(
      'service-account',
      'text',
      'channel',
      path.join(__dirname, '..', 'action.yml'),
    );
    expect(result).toEqual(true);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(uploadToBucket).toHaveBeenCalledTimes(1);
    expect(loadSecret).toHaveBeenCalledTimes(1);
  });
});
