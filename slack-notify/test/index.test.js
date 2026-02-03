import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('../src/slack-notify.js');

import * as core from '@actions/core';

import action from '../src.js';
import notifySlack from '../src/slack-notify.js';

describe('slack notification', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Can run the action', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('text')
      .mockReturnValueOnce('channel-name');
    await action();
    expect(notifySlack).toHaveBeenCalledTimes(1);
    expect(notifySlack).toHaveBeenCalledWith(
      'service-account',
      'text',
      'channel-name',
      '',
    );
  });

  test('Can run the action with file', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('text')
      .mockReturnValueOnce('channel-name')
      .mockReturnValueOnce('file');
    await action();
    expect(notifySlack).toHaveBeenCalledTimes(1);
    expect(notifySlack).toHaveBeenCalledWith(
      'service-account',
      'text',
      'channel-name',
      'file',
    );
  });
});
