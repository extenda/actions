jest.mock('axios');

const axios = require('axios');
const handleConsumers = require('../src/handle-consumers');

describe('Setup consumers and update datasource', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const allowedConsumers = [
    { clan: 'test', 'service-accounts': ['sa1', 'sa2'] },
    { clan: 'test1', 'service-accounts': ['sa1tes1', 'sa2test2'] }];

  test('it can map consumers correctly', async () => {
    axios.mockResolvedValue({ status: 200 });

    const createDatasource = {
      url: 'styraUrl/v1/datasources/systems/systemID/consumers',
      method: 'PUT',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
      data: {
        category: 'rest',
        type: 'push',
      },
    };
    const setData = {
      url: 'styraUrl/v1/data/systems/systemID/consumers',
      method: 'PUT',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
      data: {
        consumers: ['sa1', 'sa2', 'sa1tes1', 'sa2test2'],
      },
    };

    await handleConsumers('systemID', 'token', 'styraUrl', allowedConsumers);

    expect(axios).toHaveBeenNthCalledWith(1, createDatasource);
    expect(axios).toHaveBeenNthCalledWith(2, setData);
    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('it runs even if no allowed consumers', async () => {
    axios.mockResolvedValue({ status: 200 });
    await handleConsumers('systemID', 'token', 'styraUrl', undefined);

    const setData = {
      url: 'styraUrl/v1/data/systems/systemID/consumers',
      method: 'PUT',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
      data: {
        consumers: [],
      },
    };
    expect(axios).toHaveBeenNthCalledWith(2, setData);
    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('it throws error on failing to setup datasource', async () => {
    axios.mockRejectedValue({ status: 500, message: 'service unavailable' });

    await expect(handleConsumers('systemID', 'token', 'styraUrl', allowedConsumers)).rejects
      .toEqual(new Error('Request to styraUrl/v1/datasources/systems/systemID/consumers failed. Reason: service unavailable'));
    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it throws error on failing to setup data', async () => {
    axios.mockResolvedValueOnce({ status: 200 });
    axios.mockRejectedValueOnce({ status: 500, message: 'service unavailable' });

    const createDatasource = {
      url: 'styraUrl/v1/datasources/systems/systemID/consumers',
      method: 'PUT',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
      data: {
        category: 'rest',
        type: 'push',
      },
    };

    await expect(handleConsumers('systemID', 'token', 'styraUrl', allowedConsumers)).rejects
      .toEqual(new Error('Request to styraUrl/v1/data/systems/systemID/consumers failed. Reason: service unavailable'));
    expect(axios).toHaveBeenNthCalledWith(1, createDatasource);
    expect(axios).toHaveBeenCalledTimes(2);
  });
});
