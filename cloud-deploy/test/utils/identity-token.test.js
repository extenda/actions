import { execGcloud } from '../../../setup-gcloud';
import getToken from '../../src/utils/identity-token.js';

jest.mock('../../../setup-gcloud');

describe('getToken function', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and return the id token', async () => {
    execGcloud.mockResolvedValue('token');
    const result = await getToken('cloud-deploy');

    expect(result).toBe('token');
    expect(execGcloud).toHaveBeenCalledWith(
      ['auth', 'print-identity-token', '--audiences=cloud-deploy'],
      'gcloud',
      true,
    );
  });
});
