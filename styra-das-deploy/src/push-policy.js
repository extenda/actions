const request = require('request');

const fetchPolicy = (
  styraUrl, styraToken, systemId, policyType,
) => new Promise((resolve, reject) => {
  request({
    uri: `${styraUrl}/v1/policies/systems/${systemId}/policy/com.styra.envoy.${policyType}/rules/rules`,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${styraToken}`,
    },
  },
  (error, res, body) => {
    if (!error && res.statusCode === 200) {
      const jsonBody = JSON.parse(body);
      resolve(jsonBody.result.modules[`${policyType}.rego`]);
    } else {
      reject(new Error(`Couldn't fetch policy for system with id: ${systemId}`));
    }
  });
});

const pushPolicyProd = (
  styraUrl, styraToken, systemId, rego, policyType,
) => new Promise((resolve, reject) => {
  let modules = {};
  if (policyType === 'app') {
    modules = { 'app.rego': rego };
  } else {
    modules = { 'ingress.rego': rego };
  }

  const policyBody = {
    modules,
    signature: {
      signatures: [],
    },
  };
  request({
    uri: `${styraUrl}/v1/policies/systems/${systemId}/policy/com.styra.envoy.${policyType}/rules/rules`,
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

const pushPolicy = async (styraUrl, token, systemId, prodSystemId, policyType) => fetchPolicy(
  styraUrl, token, systemId, policyType,
).then((ingressRego) => pushPolicyProd(styraUrl, token, prodSystemId, ingressRego, policyType));

module.exports = pushPolicy;
