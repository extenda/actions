const { iamApiErrorToString } = require('../../src/util/iam-api-error-to-string');

describe('iamApiErrorToString', () => {
  test('http 400 error', () => {
    const err = {
      response: {
        data: { error: 'bad request', messages: ['field1 is invalid', 'field1 is invalid'] },
        status: 400,
      },
    };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Request failed with code: [400] and error [field1 is invalid,field1 is invalid]',
    );
  });

  test('http 500 error', () => {
    const err = {
      response: {
        data: { error: 'bad request' },
        status: 500,
      },
    };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Request failed with code: [500] and error [bad request]',
    );
  });

  test('other error', () => {
    const err = { message: 'Some error' };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Unexpected error for iam api: Some error',
    );
  });
});
