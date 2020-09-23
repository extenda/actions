const request = require('request');

// TODO Use Axios instead!

const fetchIamToken = async (
  apiKey, apiEmail, apiPassword, apiTenantId,
) => new Promise((resolve, reject) => {
  const loginBody = {
    email: apiEmail,
    password: apiPassword,
    tenantId: apiTenantId,
    returnSecureToken: true,
  };
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  request({
    uri: url,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: loginBody,
    json: true,
  }, (error, res, body) => {
    if (!error && res.statusCode === 200) {
      resolve(body.idToken);
    }
    reject(new Error(body));
  });
});

module.exports = fetchIamToken;
