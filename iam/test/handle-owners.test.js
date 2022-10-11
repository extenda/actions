jest.mock('@actions/core');
jest.mock('request');
jest.mock('../src/create-system');
const request = require('request');
const checkOwners = require('../src/handle-owners');
const { updateOwners } = require('../src/create-system');

describe('Check and update owners', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can get system owners and validate', async () => {
    const getOwners = {
      result: {
        subjects: [
          'test@mail.com',
        ],
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      JSON.stringify(getOwners),
    ));
    await checkOwners('system-id', 'token', 'styra-url', ['test@mail.com']);

    expect(updateOwners).toHaveBeenCalledTimes(0);
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can get system owners and update owners', async () => {
    const getOwners = {
      result: {
        subjects: [
          'test@mail.com',
        ],
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      JSON.stringify(getOwners),
    ));
    await checkOwners('system-id', 'token', 'styra-url', ['test@mail.com', 'test1@mail.com']);

    expect(updateOwners).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
