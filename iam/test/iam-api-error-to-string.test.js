import { iamApiErrorToString } from '../src/utils/iam-api-error-to-string.js';

describe('iamApiErrorToString', () => {
  test('http 400 error', () => {
    const err = {
      response: {
        data: {
          error: 'bad request',
          messages: ['field1 is invalid', 'field1 is invalid'],
        },
        status: 400,
      },
    };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Request failed with code [400] and error [field1 is invalid,field1 is invalid]',
    );
  });

  test('http 404 error', () => {
    const err = {
      response: {
        data: { error: 'Not found', messages: 'Not found' },
        status: 404,
      },
    };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Request failed with code [404] and error [Not found]',
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
      'description. Request failed with code [500] and error [bad request]',
    );
  });

  test('other error', () => {
    const err = { message: 'Some error' };

    expect(iamApiErrorToString(err, 'description')).toEqual(
      'description. Unexpected error for iam api: Some error',
    );
  });
});
