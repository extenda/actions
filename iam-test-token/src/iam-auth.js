const axios = require('axios');

const fetchIamToken = async (apiKey, apiEmail, apiPassword, apiTenantId) => axios.post(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  {
    email: apiEmail,
    password: apiPassword,
    tenantId: apiTenantId,
    returnSecureToken: true,
  },
).then((response) => response.data.idToken)
  .catch((err) => {
    throw new Error(`Authentication failed. HTTP status: ${err.response.status}. Reason: ${err.response.data || 'N/A'}`);
  });

module.exports = fetchIamToken;
