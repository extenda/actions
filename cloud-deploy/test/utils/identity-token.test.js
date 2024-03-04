const { GoogleAuth } = require('google-auth-library');
const getToken = require('../../src/utils/identity-token');

describe('getToken function', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and return the id token', async () => {
    const targetAudience = 'cloud-deploy';
    const mockIdToken = 'mocked-id-token';

    const idTokenProviderMock = {
      fetchIdToken: jest.fn().mockResolvedValue(mockIdToken),
    };

    const getIdTokenClientMock = jest.fn().mockResolvedValue({
      idTokenProvider: idTokenProviderMock,
    });

    jest.spyOn(GoogleAuth.prototype, 'getIdTokenClient').mockImplementation(getIdTokenClientMock);

    const result = await getToken();

    expect(result).toBe(mockIdToken);
    expect(getIdTokenClientMock).toHaveBeenCalledWith(targetAudience);
    expect(idTokenProviderMock.fetchIdToken).toHaveBeenCalledWith(targetAudience);
  });
});
