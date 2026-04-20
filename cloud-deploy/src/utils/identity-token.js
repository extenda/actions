import { getIdToken } from 'setup-gcloud/src/index.js';

const getToken = async (audience = 'platform') => getIdToken(audience);

export default getToken;
