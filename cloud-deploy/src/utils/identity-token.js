import { getIdToken } from 'setup-gcloud/src/index.js';

const getToken = async (audience = 'cloud-deploy') => getIdToken(audience);

export default getToken;
