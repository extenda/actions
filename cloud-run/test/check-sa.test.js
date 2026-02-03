import * as exec from '@actions/exec';
import { afterEach, describe, expect, test, vi } from 'vitest';

import checkServiceAccount from '../src/check-sa.js';

vi.mock('@actions/exec');

const revisionsListString = [
  `service-name1@test-staging-t3st.iam.gserviceaccount.com
service-name@test-staging-t3st.iam.gserviceaccount.com
service-name2@test-staging-t3st.iam.gserviceaccount.com`,
];

describe('check service account', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('it checks service account exists', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(revisionsListString),
    );
    checkServiceAccount('service-name', 'test-staging-t3st');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test("it checks service account doesn't exist", async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(revisionsListString),
    );
    await expect(
      checkServiceAccount('service-name3', 'test-staging-t3st'),
    ).rejects.toEqual(
      new Error(
        'This service has no service account. Please refer to "https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services" for help',
      ),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
