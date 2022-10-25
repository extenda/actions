const request = require('request');
const core = require('@actions/core');

const updateRepository = async (system, token, styraUrl) => new Promise((resolve, reject) => {
  const url = `${styraUrl}/v1/systems/${system.id}`;
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: system,
    json: true,
  }, (error, res) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(res.statusCode === 200);
    }
  });
});

const checkRepository = async (system, styraToken, styraUrl, repository) => {
  if (system.source_control && system.source_control.origin.url !== `https://github.com/extenda/${repository}.git`) {
    const updatedSystem = system;
    updatedSystem.source_control.origin.url = `https://github.com/extenda/${repository}.git`;
    core.info('Repository change found, updating github reference for system!');
    return updateRepository(updatedSystem, styraToken, styraUrl);
  }
  return null;
};

module.exports = checkRepository;
