import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  evaluationSpec,
  STABLE_TAG,
} from '../../src/manifests/evaluation-sidecar.js';
import getImageWithSha256 from '../../src/manifests/image-sha256.js';

vi.mock('../../src/manifests/image-sha256.js');

const originalEnv = process.env;
const projectId = 'my-clan-project';

describe('manifests/evaluation-sidecar', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EVALUATION_IMAGE_TAG;
    getImageWithSha256.mockResolvedValueOnce(
      'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar@sha256:123',
    );
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  test('It uses the stable tag when no version is set', async () => {
    const { container } = await evaluationSpec(projectId, false, {
      enabled: true,
    });
    expect(getImageWithSha256).toHaveBeenCalledWith(
      `eu.gcr.io/extenda/entity-conditions-evaluation-sidecar:${STABLE_TAG}`,
    );
    expect(container.image).toEqual(
      'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar@sha256:123',
    );
  });

  test('It resolves a custom version tag', async () => {
    const { container } = await evaluationSpec(projectId, false, {
      enabled: true,
      version: 'a1b2c3d',
    });
    expect(getImageWithSha256).toHaveBeenCalledWith(
      'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar:a1b2c3d',
    );
    expect(container.image).toEqual(
      'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar@sha256:123',
    );
  });

  test('It uses the EVALUATION_IMAGE_TAG env var to override the version', async () => {
    process.env.EVALUATION_IMAGE_TAG = 'preview';
    await evaluationSpec(projectId, false, {
      enabled: true,
      version: 'a1b2c3d',
    });
    expect(getImageWithSha256).toHaveBeenCalledWith(
      'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar:preview',
    );
  });

  test('It defaults OCMS credentials to an aliased secretKeyRef on Cloud Run, with a matching secret alias', async () => {
    const { container, secretAliases } = await evaluationSpec(
      projectId,
      false,
      { enabled: true },
    );
    expect(container).toMatchObject({
      name: 'evaluation',
      env: [
        {
          name: 'OCMS_CLIENT_ID',
          valueFrom: {
            secretKeyRef: { key: 'latest', name: 'ecs-api-ocms-client-id' },
          },
        },
        {
          name: 'OCMS_CLIENT_SECRET',
          valueFrom: {
            secretKeyRef: {
              key: 'latest',
              name: 'ecs-api-ocms-client-secret',
            },
          },
        },
        { name: 'REQUEST_ALL_BUNDLE', value: 'false' },
      ],
    });
    expect(secretAliases).toEqual([
      'ecs-api-ocms-client-id:projects/377710398576/secrets/ecs-api-ocms-client-id',
      'ecs-api-ocms-client-secret:projects/377710398576/secrets/ecs-api-ocms-client-secret',
    ]);
  });

  test('It defaults OCMS credentials to literal sm:// values on GKE for Berglas to resolve, with no secret aliases', async () => {
    const { container, secretAliases } = await evaluationSpec(projectId, true, {
      enabled: true,
    });
    expect(container).toMatchObject({
      name: 'evaluation',
      env: [
        {
          name: 'OCMS_CLIENT_ID',
          value: 'sm://extenda/ecs-api-ocms-client-id',
        },
        {
          name: 'OCMS_CLIENT_SECRET',
          value: 'sm://extenda/ecs-api-ocms-client-secret',
        },
        { name: 'REQUEST_ALL_BUNDLE', value: 'false' },
      ],
    });
    expect(secretAliases).toEqual([]);
  });

  test('It allows overriding non-reserved env vars', async () => {
    const { container } = await evaluationSpec(projectId, false, {
      enabled: true,
      env: {
        REQUEST_ALL_BUNDLE: 'true',
        CUSTOM_VAR: 'sm://*/custom-secret',
      },
    });
    expect(container.env).toEqual(
      expect.arrayContaining([
        { name: 'REQUEST_ALL_BUNDLE', value: 'true' },
        {
          name: 'CUSTOM_VAR',
          valueFrom: {
            secretKeyRef: { key: 'latest', name: 'custom-secret' },
          },
        },
      ]),
    );
  });

  test('It resolves same-project custom secrets to a bare secretKeyRef with no alias needed', async () => {
    const { container, secretAliases } = await evaluationSpec(
      projectId,
      false,
      {
        enabled: true,
        env: {
          CUSTOM_VAR: `sm://${projectId}/custom-secret`,
        },
      },
    );
    expect(container.env).toEqual(
      expect.arrayContaining([
        {
          name: 'CUSTOM_VAR',
          valueFrom: {
            secretKeyRef: { key: 'latest', name: 'custom-secret' },
          },
        },
      ]),
    );
    expect(secretAliases).not.toEqual(
      expect.arrayContaining([expect.stringContaining('custom-secret')]),
    );
  });

  test('It rejects a custom secret referencing a project outside the deploying project and the extenda project', async () => {
    await expect(
      evaluationSpec(projectId, false, {
        enabled: true,
        env: {
          CUSTOM_VAR: 'sm://some-other-project/custom-secret',
        },
      }),
    ).rejects.toThrow(/not supported/);
  });

  test('It rejects overriding OCMS_CLIENT_ID or OCMS_CLIENT_SECRET', async () => {
    await expect(
      evaluationSpec(projectId, false, {
        enabled: true,
        env: { OCMS_CLIENT_ID: 'sm://*/some-other-secret' },
      }),
    ).rejects.toThrow(/cannot be overridden/);

    await expect(
      evaluationSpec(projectId, false, {
        enabled: true,
        env: { OCMS_CLIENT_SECRET: 'sm://*/some-other-secret' },
      }),
    ).rejects.toThrow(/cannot be overridden/);
  });
});
