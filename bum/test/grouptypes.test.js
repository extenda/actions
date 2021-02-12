jest.mock('@actions/core');
jest.mock('axios');

const axios = require('axios');
const {
  setupGroupTypes, getGroupType, createGroupType, updateGroupType,
} = require('../src/grouptypes');

describe('Setup groupTypes and handle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const groupTypes = [
    {
      id: 'legal',
      name: 'Legal type',
      description: 'Legal group type',
    },
  ];

  test('it can setup groupTypes for creation', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ status: 201 });

    await setupGroupTypes(groupTypes, 'sys-id', 'iam-token', 'bum-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('It can setup groupTypes for update', async () => {
    const getGroupTypeResponse = {
      id: 'price',
      name: 'Price type',
      description: 'price group type',
    };

    axios.mockResolvedValueOnce({ status: 200, data: getGroupTypeResponse })
      .mockResolvedValueOnce({ status: 200 });

    await setupGroupTypes(groupTypes, 'sys-id', 'iam-token', 'bum-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('It can setup groupTypes which are in-sync (no update)', async () => {
    const getGroupTypeResponse = {
      id: 'legal',
      name: 'Legal type',
      description: 'Legal group type',
    };
    axios.mockResolvedValueOnce({ status: 200, data: getGroupTypeResponse });

    await setupGroupTypes(groupTypes, 'sys-id', 'iam-token', 'bum-url');

    expect(axios).toHaveBeenCalledTimes(1);
  });


  test('it gets a groupType that exists', async () => {
    const getGroupTypeResponse = {
      id: 'price',
      name: 'Price type',
    };

    axios.mockResolvedValueOnce({ status: 200, data: getGroupTypeResponse });

    await expect(getGroupType('iam-token', 'bum-url', 'price'))
      .resolves.toEqual(getGroupTypeResponse);

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it gets a groupType that doesn\'t exist', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(getGroupType('iam-token', 'bum-url', 'region'))
      .resolves.toEqual(true);

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it fails to get a groupType', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });

    await expect(getGroupType('iam-token', 'bum-url', 'foo'))
      .rejects.toEqual(new Error('Could not fetch groupType from bum-service. Reason: Error Message'));

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it creates a new groupType', async () => {
    axios.mockResolvedValueOnce({ status: 200 });

    await expect(createGroupType('iam-token', 'price', 'price type', 'Description', 'bum-url'))
      .resolves.toEqual('groupType \'price\' added');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it failes to create a new groupType', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });

    await expect(createGroupType('iam-token', 'price', 'price type', 'Description', 'bum-url'))
      .rejects.toEqual(new Error('Couldn\'t add groupType \'price\'. Reason: Error Message'));

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it updates a groupType', async () => {
    axios.mockResolvedValueOnce({ status: 200 });

    await expect(updateGroupType('iam-token', 'price', 'price type', 'Description', 'bum-url'))
      .resolves.toEqual('groupType \'price\' updated');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it failes to update a groupType', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });
    await expect(updateGroupType('iam-token', 'price', 'price type', 'Description', 'bum-url'))
      .rejects.toEqual(new Error('Couldn\'t update groupType \'price\'. Reason: Error Message'));

    expect(axios).toHaveBeenCalledTimes(1);
  });
});
