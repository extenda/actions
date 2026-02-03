jest.mock('@actions/core');

import core from '@actions/core';

import action from '../src/index';

describe('run push policy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    await action();
    expect(core.warning).toHaveBeenCalledWith(expect.any(String));
  });
});
