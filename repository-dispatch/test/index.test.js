jest.mock('@actions/core');
jest.mock('../../utils');

const mockDispatch = jest.fn();

jest.mock('@actions/github', () => ({
  GitHub: function GitHub() {
    return {
      repos: {
        createDispatchEvent: mockDispatch,
      },
    };
  },
  context: {
    repo: () => ({
      owner: 'extenda',
      repo: 'actions',
    }),
    payload: {
      test: 'payload',
    },
  },
}));

const core = require('@actions/core');
const action = require('../src/index');
const { loadGitHubToken } = require('../../utils');

describe('repository-dispatch', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    loadGitHubToken.mockResolvedValueOnce('github-token');
    mockDispatch.mockResolvedValueOnce(null);
  });

  test('It can dispatch an event', async () => {
    core.getInput.mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('test-event')
      .mockReturnValueOnce('');
    await action();
    expect(mockDispatch).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      event_type: 'test-event',
      client_payload: {
        github: {
          test: 'payload',
        },
      },
    });
  });

  test('It can dispatch a custom payload', async () => {
    core.getInput.mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('test-event')
      .mockReturnValueOnce('{"custom": "value"}');
    await action();
    expect(mockDispatch).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      event_type: 'test-event',
      client_payload: {
        custom: 'value',
      },
    });
  });

  test('It fails if custom JSON is too big', async () => {
    const bigObject = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      key4: 'value4',
      key5: 'value5',
      key6: 'value6',
      key7: 'value7',
      key8: 'value8',
      key9: 'value9',
      key10: 'value10',
      key11: 'value11',
    };

    core.getInput.mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('test-event')
      .mockReturnValueOnce(JSON.stringify(bigObject));

    await expect(action()).rejects.toEqual(new Error('client-payload can at most contain 10 top-level keys'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
