const getImageWithSha256 = require('./image-sha256');

const IMAGE_NAME = 'eu.gcr.io/extenda/security';

const volumeMounts = (protocol) => {
  const volumes = [];
  volumes.push({ mountPath: '/config', name: 'opa', readOnly: true });
  if (protocol === 'http2') {
    volumes.push({ mountPath: '/etc/extenda/certs', name: 'extenda-certs', readOnly: true });
  }
  return volumes;
};

const securitySpec = async (protocol) => getImageWithSha256(`${IMAGE_NAME}:authz`)
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
