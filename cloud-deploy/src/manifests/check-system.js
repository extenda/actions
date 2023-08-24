const request = require('request');

const checkSystem = async (systemName, styraToken, styraUrl) => new Promise((resolve) => {
  const url = `${styraUrl}/v1/systems?compact=false&name=${systemName}`;
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
  }, (error, res, body) => {
    if (!error) {
      const jsonBody = JSON.parse(body);
      jsonBody.result.forEach((result) => {
        if (result.name === `${systemName}`) {
          resolve(result);
        }
      });
      resolve({ id: '' });
    }
  });
});

module.exports = checkSystem;
