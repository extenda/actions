const request = require('request');

const fetchMaskLog = (styraUrl, styraToken, systemId) => new Promise((resolve, reject) => {
  request(
    {
      uri: `${styraUrl}/v1/policies/systems/${systemId}/system/log`,
      method: 'GET',
      headers: {
        'Content-type': 'application/json',
        Authorization: `bearer ${styraToken}`,
      },
    },
    (error, res, body) => {
      if (!error && res.statusCode === 200) {
        const jsonBody = JSON.parse(body);
        resolve(jsonBody.result.modules['mask.rego']);
      } else {
        reject(new Error(`Couldn't fetch mask for system with id: ${systemId}`));
      }
    },
  );
});

const pushMaskLogProd = (
  styraUrl,
  styraToken,
  systemId,
  maskPolicy,
) => new Promise((resolve, reject) => {
  const modules = { 'mask.rego': maskPolicy };

  const policyBody = {
    modules,
    signature: {
      signatures: [],
    },
  };
  request({
    uri: `${styraUrl}/v1/policies/systems/${systemId}/system/log`,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
    body: policyBody,
    json: true,
  }, (error, res) => {
    if (!error && res.statusCode === 200) {
      resolve('Mask updated successfully');
    } else {
      reject(new Error('Couldn\'t update mask for production system'));
    }
  });
});

const pushMask = async (
  styraUrl,
  token,
  systemId,
  prodSystemId,
) => fetchMaskLog(styraUrl, token, systemId)
  .then((maskPolicy) => pushMaskLogProd(styraUrl, token, prodSystemId, maskPolicy));

module.exports = pushMask;
