const getImageWithSha256 = require('./image-sha256');

const collectorSpec = async (monitoring) => {
  const {
    prometheus: {
      interval = -1,
      path = '/metrics',
      port = 8080,
    } = {},
  } = monitoring || {};

  if (interval < 0) {
    return null;
  }

  const environment = {
    SCRAPE_PATH: path,
    SCRAPE_PORT: port,
    SCRAPE_INTERVAL: interval,
  };

  const image = await getImageWithSha256('eu.gcr.io/extenda/run-gmp-collector:v1.0.0');

  return {
    image,
    name: 'collector',
    resources: {
      limits: {
        cpu: '0.1',
        memory: '128Mi',
      },
    },
    env: Object.entries(environment).map(([name, value]) => ({
      name,
      value: `${value}`,
    })),
  };
};

module.exports = collectorSpec;
