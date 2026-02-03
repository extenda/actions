import {
  configMapManifest,
  removeScalerConfiguration,
} from '../../src/manifests/vpa-scaler-configmap';
import gcloudOutput from '../../src/utils/gcloud-output';

jest.mock('../../src/utils/gcloud-output', () =>
  jest.fn().mockImplementation(() => Promise.resolve()),
);

describe('VPA scaler configuration', () => {
  const mockServiceName = 'service-name';
  const mockType = 'Deployment';
  const mockCPU = 1.5;
  const mockMemory = '2.5Gi';
  const mockScalingConfig = {
    'increments-cpu': 1,
    threshold: 50,
    'max-cpu': 5,
    'max-memory': '8Gi',
    'scale-up-interval': 5,
  };

  const mockConfigMapResult = `apiVersion: v1
  data:
    currentCPU: 1500m
    currentMemory: 2500Mi
    incrementsCPU: 1000m
    maxCPU: 5000m
    maxMemory: 8000Mi
    scaleUpInterval: 5
    minCPU: 1500m
    minMemory: 2500Mi
    thresholdCPU: 50%
    type: Deployment
  kind: ConfigMap
  metadata:
    creationTimestamp: null
    name: vpa-scaler-configuration
    namespace: service-name
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should generate a scaler configuarion configmap', async () => {
    gcloudOutput.mockResolvedValueOnce(mockConfigMapResult);
    await expect(
      configMapManifest(
        mockServiceName,
        mockType,
        mockCPU,
        mockMemory,
        mockScalingConfig,
      ),
    ).resolves.toEqual(mockConfigMapResult);
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'create',
        'configmap',
        'vpa-scaler-configuration',
        `--namespace=${mockServiceName}`,
        `--from-literal=type=${mockType}`,
        '--from-literal=incrementsCPU=1000m',
        '--from-literal=thresholdCPU=50%',
        '--from-literal=currentCPU=1500m',
        '--from-literal=currentMemory=2500Mi',
        '--from-literal=maxCPU=5000m',
        '--from-literal=minCPU=1500m',
        '--from-literal=maxMemory=8000Mi',
        '--from-literal=minMemory=2500Mi',
        '--from-literal=scaleUpInterval=5',
        '--output=yaml',
        '--dry-run=client',
      ]),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should generate the correct scaler configuarion using Mi', async () => {
    gcloudOutput.mockResolvedValueOnce(mockConfigMapResult);
    await expect(
      configMapManifest(
        mockServiceName,
        mockType,
        mockCPU,
        '2500Mi',
        mockScalingConfig,
      ),
    ).resolves.toEqual(mockConfigMapResult);
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'create',
        'configmap',
        'vpa-scaler-configuration',
        `--namespace=${mockServiceName}`,
        `--from-literal=type=${mockType}`,
        '--from-literal=incrementsCPU=1000m',
        '--from-literal=thresholdCPU=50%',
        '--from-literal=currentCPU=1500m',
        '--from-literal=currentMemory=2500Mi',
        '--from-literal=maxCPU=5000m',
        '--from-literal=minCPU=1500m',
        '--from-literal=maxMemory=8000Mi',
        '--from-literal=minMemory=2500Mi',
        '--from-literal=scaleUpInterval=5',
        '--output=yaml',
        '--dry-run=client',
      ]),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should be able to delete scaler configuration', async () => {
    gcloudOutput.mockResolvedValueOnce();
    await removeScalerConfiguration(mockServiceName);
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'delete',
        'configmap',
        'vpa-scaler-configuration',
        `--namespace=${mockServiceName}`,
      ]),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should be fail quietly if configuration does not exist', async () => {
    gcloudOutput.mockRejectedValueOnce();
    await removeScalerConfiguration(mockServiceName);
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'delete',
        'configmap',
        'vpa-scaler-configuration',
        `--namespace=${mockServiceName}`,
      ]),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });
});
