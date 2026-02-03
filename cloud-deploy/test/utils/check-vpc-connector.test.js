jest.mock('../../src/utils/gcloud-output');
import checkVpcConnector from '../../src/utils/check-vpc-connector';
import gcloudOuput from '../../src/utils/gcloud-output';

const listVpcConnectorsWithoutMatchingName = [
  {
    machineType: 'e2-micro',
    maxInstances: 3,
    maxThroughput: 300,
    minInstances: 2,
    minThroughput: 200,
    name: 'projects/some-project/locations/europe-west1/connectors/failing-connector',
    network: 'some-network',
    state: 'READY',
    subnet: {
      name: 'vpc-connector-subnet',
      projectId: 'some-project',
    },
  },
  {
    machineType: 'e2-micro',
    maxInstances: 3,
    maxThroughput: 300,
    minInstances: 2,
    minThroughput: 200,
    name: 'projects/some-project/locations/europe-west1/connectors/some-connector',
    network: 'clan-network',
    state: 'READY',
    subnet: {
      name: 'vpc-connector-subnet',
      projectId: 'some-project',
    },
  },
];

describe('check vpc connector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can return name if listed connectors match', async () => {
    gcloudOuput.mockResolvedValueOnce(
      JSON.stringify(listVpcConnectorsWithoutMatchingName),
    );

    const connector = await checkVpcConnector(
      'some-project',
      'europe-west1',
      'some-connector',
    );
    expect(connector).toEqual('some-connector');
    expect(gcloudOuput).toHaveBeenCalledTimes(1);
  });

  test('It can return name if no match but connector exists on network', async () => {
    gcloudOuput.mockResolvedValueOnce(
      JSON.stringify(listVpcConnectorsWithoutMatchingName),
    );

    const connector = await checkVpcConnector(
      'some-project',
      'europe-west1',
      'some-connector123',
    );
    expect(connector).toEqual('some-connector');
    expect(gcloudOuput).toHaveBeenCalledTimes(1);
  });

  test('It can fail if no connector on clan-network', async () => {
    gcloudOuput.mockResolvedValueOnce(JSON.stringify([]));

    await expect(
      checkVpcConnector('some-project', 'europe-west1', 'some-connector'),
    ).rejects.toThrow('No connector found for this project some-project');
    expect(gcloudOuput).toHaveBeenCalledTimes(1);
  });
});
