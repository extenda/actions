import axios from 'axios';

const getLatestVersion = async () =>
  axios
    .get('https://dl.google.com/dl/cloudsdk/channels/rapid/components-2.json')
    .then((response) => response.data.version);

module.exports = getLatestVersion;
