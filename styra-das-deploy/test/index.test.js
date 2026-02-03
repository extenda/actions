jest.mock('@actions/core');

import * as core from '@actions/core';

import action from '../src/index.js';

describe('run push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    await action();
    expect(core.warning).toHaveBeenCalledWith(expect.any(String));
  });
});
