import core from '@actions/core';

import { loadCacheKeys } from '../utils/security-cache-keys';
import selectSemver from '../utils/select-semver';
import getImageWithSha256 from './image-sha256';

const IMAGE_NAME = 'eu.gcr.io/extenda/security';

// The generally available and stable security sidecar version.
const STABLE_VERSION = 'v1.7.4';

const volumeMounts = (protocol) => {
  const volumes = [];
  if (protocol === 'http2') {
    volumes.push({
      mountPath: '/etc/extenda/certs',
      name: 'extenda-certs',
      readOnly: true,
    });
  }
  return volumes;
};

const getImageTag = ({ 'preview-tag': previewTag = null } = {}) =>
  selectSemver(
    process.env.SECURITY_IMAGE_TAG || previewTag || STABLE_VERSION,
    STABLE_VERSION,
  );

const securitySpec = async (
  protocol,
  platformGKE = true,
  corsEnabled = false,
  previewTag = null,
) => {
  const imageTag = getImageTag({ 'preview-tag': previewTag });
  core.info(`Use image tag: ${imageTag}`);
  return getImageWithSha256(`${IMAGE_NAME}:${imageTag}`).then((image) => {
    const env = [
      {
        name: 'LAUNCHDARKLY_SDK_KEY',
        value: process.env.SEC_LAUNCHDARKLY_SDK_KEY || '',
      },
      {
        name: 'OPA_CONFIG_SYSTEM_NAME',
        value: process.env.IAM_SYSTEM_NAME || '',
      },
      {
        name: 'ENVOY_CORS',
        value: corsEnabled ? 'true' : 'false',
      },
    ];
    if (platformGKE) {
      env.push({
        name: 'ENVOY_PROTOCOL',
        value: protocol === 'http' ? 'http' : 'http2',
      });
    } else {
      env.push({
        name: 'ENVOY_PROTOCOL',
        value: protocol === 'http' ? 'http' : 'h2c',
      });
    }

    const customBucketName = process.env.SECURITY_BUCKET_NAME;
    if (customBucketName) {
      env.push({
        name: 'OPA_CONFIG_BUCKET_NAME',
        value: customBucketName,
      });
    }

    const cacheKeys = loadCacheKeys();
    if (cacheKeys) {
      env.push({
        name: 'CACHE_KEYS',
        value: JSON.stringify(cacheKeys),
      });
    }

    return {
      name: 'security-authz',
      image,
      ports: [
        {
          name: protocol === 'http2' ? 'h2c' : 'http1',
          containerPort: 8000,
        },
      ],
      env,
      livenessProbe: {
        httpGet: {
          path: '/health',
          port: 9001,
        },
        initialDelaySeconds: 5,
        periodSeconds: 10,
        timeoutSeconds: 3,
        failureThreshold: 3,
      },
      volumeMounts: volumeMounts(protocol),
    };
  });
};

module.exports = { STABLE_VERSION, securityVersion: getImageTag, securitySpec };
