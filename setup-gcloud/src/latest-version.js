// const axios = require('axios');
//
// const getLatestVersion = async () => axios.get('https://dl.google.com/dl/cloudsdk/channels/rapid/components-2.json')
//   .then((response) => response.data.version);

// Pin the version to a version known to support canary rollout.
const getPinnedVersion = async () => '365.0.0';

module.exports = getPinnedVersion;
