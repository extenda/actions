const axios = require('axios');

const fetchSystemId = async (
  styraUrl, styraToken, systemName,
) => {
  const url = `${styraUrl}/v1/systems?compact=true&name=${systemName}`;
  return axios({
    url,
    method: 'GET',
    headers: {
      authorization: `Bearer ${styraToken}`,
      'content-type': 'application/json',
    },
  }).then((response) => response.data.result[0].id)
    .catch((err) => {
      if (err.response.status === 404) {
        throw new Error(`Failed to fetch system ${systemName}. Reason: ${err.message}`);
      }
    });
};

module.exports = fetchSystemId;
