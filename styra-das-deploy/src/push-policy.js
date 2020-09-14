const request = require('request');

const fetchPolicy = (styraUrl, styraToken, systemId) => new Promise((resolve, reject) => {
  request({
    uri: `${styraUrl}/v1/policies/systems/${systemId}/policy/com.styra.envoy.ingress/rules/rules`,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
  },
  (error, res, body) => {
    if (!error && res.statusCode === 200) {
      const jsonBody = JSON.parse(body);
      resolve(jsonBody.result.modules['ingress.rego']);
    } else {
      reject(new Error(`Couldn't fetch policy for system with id: ${systemId}`));
    }
  });
});

const pushPolicyProd = (
  styraUrl, styraToken, systemId, ingressRego,
) => new Promise((resolve, reject) => {
  const policyBody = {
    modules: {
      'ingress.rego': ingressRego,
    },
    signature: {
      signatures: [],
    },
  };
  request({
    uri: `${styraUrl}/v1/policies/systems/${systemId}/policy/com.styra.envoy.ingress/rules/rules`,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
    body: policyBody,
    json: true,
  }, (error, res) => {
    if (!error && res.statusCode === 200) {
      resolve('policy updated successfully');
    } else {
      reject(new Error('Couldn\'t update policy for production system'));
    }
  });
});

const pushPolicy = async (styraUrl, token, systemId, prodSystemId) => fetchPolicy(
  styraUrl, token, systemId,
).then((ingressRego) => pushPolicyProd(styraUrl, token, prodSystemId, ingressRego));

module.exports = pushPolicy;
