const axios = require('axios');
const core = require('@actions/core');

/**
 * @param auth {{key: string, email: string, pass: string, gipTenantId}}
 * @return {Promise<string>}
 */

let tokenCache = null;
async function fetchToken({
  key, email, pass, gipTenantId,
}) {
  if (tokenCache) {
    return tokenCache;
  }
  try {
    const result = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
      {
        email,
        password: pass,
        tenantId: gipTenantId,
        returnSecureToken: true,
      },
    );
    tokenCache = result.data.idToken;
    return tokenCache;
  } catch (e) {
    console.log(e);
    const err = e.response
      ? `code - ${e.response.status}, data - ${JSON.stringify(e.response.data)}`
      : e.message;
    throw new Error(`Could not get auth token from GIP. ${err}`);
  }
}

/**
 * Returns EXE API client.
 * @param auth {{key: string, email: string, pass: string, gipTenantId}}
 * @return {import('axios').AxiosInstance}
 */

function createExeApi(auth) {
  const instance = axios.create({
    baseURL: 'https://exe-management.retailsvc.com',
  });

  const addToken = async (config) => {
    const token = await fetchToken(auth);
    core.info(`Request ${Buffer.from(token.split('.')[1], 'base64').toString()}`);
    return ({
      ...config,
      headers: { ...config.headers, authorization: await fetchToken(auth) },
    });
  };
  const formatError = (err) => {
    const { status, data } = err.response;
    const msg = `EXE API call failed: [${status}] - ${data.message || data.error}`;
    throw new Error(msg);
  };
  instance.interceptors.request.use(addToken, formatError);

  return instance;
}

module.exports = { createExeApi };