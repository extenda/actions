import core from '@actions/core';
import axios from 'axios';

/**
 * @param auth {{key: string, email: string, pass: string, gipTenantId}}
 * @return {Promise<string>}
 */

let tokenCache = null;
async function fetchToken({ key, email, pass, gipTenantId }) {
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
    core.error(e.message);
    const err = e.response
      ? `code - ${e.response.status}, data - ${JSON.stringify(e.response.data)}`
      : e.message;
    throw new Error(`Could not get auth token from GIP. ${err}`);
  }
}

/**
 * Returns API client.
 * @param config {{
 *    name: string,
 *    url: string,
 *    auth: {key: string, email: string, pass: string, gipTenantId}
 *  }}
 * @return {import('axios').AxiosInstance}
 */

function createApi({ name, url, auth }) {
  const instance = axios.create({
    baseURL: url,
  });

  const addToken = async (config) => ({
    ...config,
    headers: {
      ...config.headers,
      authorization: `Bearer ${await fetchToken(auth)}`,
    },
  });
  const formatError = (err) => {
    const { status, data } = err.response;
    const msg = `${name} API call failed: [${status}] - ${data.message || data.error}`;
    throw new Error(msg);
  };
  instance.interceptors.request.use(addToken, formatError);

  return instance;
}

module.exports = { createApi };
