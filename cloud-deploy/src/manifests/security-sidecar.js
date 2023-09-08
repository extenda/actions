const gcloudOutput = require('../utils/gcloud-output');

const IMAGE_NAME = 'eu.gcr.io/extenda/security';

const getSecurityImage = async () => gcloudOutput([
  'container',
  'images',
  'describe',
  `${IMAGE_NAME}:authz`,
  '--format=get(image_summary.digest)',
]).then((digest) => `${IMAGE_NAME}@${digest}`);

const volumeMounts = (protocol) => {
  const volumes = [];
  volumes.push({ mountPath: '/config', name: 'opa', readOnly: true });
  if (protocol === 'http2') {
    volumes.push({ mountPath: '/etc/extenda/certs', name: 'extenda-certs', readOnly: true });
  }
  return volumes;
};

const securitySpec = async (protocol) => getSecurityImage()
  .then((image) => ({
    name: 'security-authz',
    image,
    ports: [
      { containerPort: 9001 },
    ],
    env: [{
      name: 'ENVOY_PROTOCOL',
      value: protocol === 'http' ? 'http' : 'http2',
    }],
    volumeMounts: volumeMounts(protocol),
  }));

module.exports = securitySpec;
