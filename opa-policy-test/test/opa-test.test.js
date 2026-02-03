import { exec } from '@actions/exec';

import { loadTool } from '../../utils';
import opaTest from '../src/opa-test.js';

jest.mock('@actions/exec');
jest.mock('../../utils/src');

test('It can run an OPA test', async () => {
  exec.mockResolvedValueOnce(0);
  loadTool.mockResolvedValueOnce('opa_linux_amd64_static');
  const result = await opaTest('test-bundle');
  expect(result).toEqual(0);
  expect(loadTool).toHaveBeenCalled();
  expect(exec).toHaveBeenCalledWith('opa_linux_amd64_static', [
    'test',
    '--verbose',
    '--bundle',
    'test-bundle',
  ]);
});
