const getImageWithSha256 = require('./image-sha256');

const IMAGE_NAME = 'eu.gcr.io/extenda/security';

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

const securitySpec = async (protocol, platformGKE = true) => {
  const imageTag = process.env.SECURITY_IMAGE_TAG || 'authz';
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

module.exports = securitySpec;
