import {
  deletePodMonitor,
  podMonitorManifest,
} from '../../src/manifests/pod-monitoring.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';

jest.mock('../../src/utils/gcloud-output');

describe('manifests/pod-monitoring', () => {
  test('It generates a manifest', () => {
    const manifest = podMonitorManifest('test', {
      prometheus: {
        interval: 15,
      },
    });
    expect(manifest).toEqual({
      apiVersion: 'monitoring.googleapis.com/v1',
      kind: 'PodMonitoring',
      metadata: {
        name: 'test',
        namespace: 'test',
      },
      spec: {
        selector: {
          matchLabels: {
            app: 'test',
          },
        },
        endpoints: [
          {
            interval: '15s',
            path: '/metrics',
            port: 8080,
          },
        ],
      },
    });
  });

  test('It generates a manifest for security-authz', () => {
    const manifest = podMonitorManifest('test', {}, true);
    expect(manifest).toEqual({
      apiVersion: 'monitoring.googleapis.com/v1',
      kind: 'PodMonitoring',
      metadata: {
        name: 'test',
        namespace: 'test',
      },
      spec: {
        selector: {
          matchLabels: {
            app: 'test',
          },
        },
        endpoints: [
          {
            interval: '60s',
            path: '/metrics',
            port: 9001,
          },
        ],
      },
    });
  });

  test('It deletes existing monitors when none is defined', async () => {
    gcloudOutput.mockResolvedValueOnce(0);
    await deletePodMonitor('test');
    expect(gcloudOutput).toHaveBeenCalledWith(
      ['delete', 'podmonitorings', '--namespace=test', 'test'],
      'kubectl',
      true,
      true,
    );
  });

  test('It can delete missing monitors', async () => {
    gcloudOutput.mockRejectedValueOnce(1);
    await deletePodMonitor('test');
    expect(gcloudOutput).toHaveBeenCalledWith(
      ['delete', 'podmonitorings', '--namespace=test', 'test'],
      'kubectl',
      true,
      true,
    );
  });
});
