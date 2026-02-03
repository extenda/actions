import axios from 'axios';

const fetchIamToken = async (apiKey, apiEmail, apiPassword, apiTenantId) =>
  axios
    .post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: apiEmail,
        password: apiPassword,
        tenantId: apiTenantId,
        returnSecureToken: true,
      },
    )
    .then((response) => response.data.idToken)
    .catch((err) => {
      const { data = {} } = err.response;
      const reason = JSON.stringify(data);
      throw new Error(
        `Authentication failed. HTTP status: ${err.response.status}. Reason: ${reason}`,
      );
    });

export default fetchIamToken;
