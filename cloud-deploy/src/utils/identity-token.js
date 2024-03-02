const { GoogleAuth } = require('google-auth-library');

const targetAudience = 'cloud-deploy';
const googleAuth = new GoogleAuth();

const getToken = async () => {
  const client = await googleAuth.getIdTokenClient(targetAudience);
  return client.idTokenProvider.fetchIdToken(targetAudience);
};

module.exports = getToken;
