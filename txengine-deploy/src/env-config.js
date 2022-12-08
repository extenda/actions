const yaml = require('yaml');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const { getImageDigest } = require('../../utils/src');

const createReplaceTokens = (projectId, image, tenantName, countryCode) => {
  let tenantLowerCase = tenantName.toLowerCase();
  const namespace = [tenantLowerCase];
  if (countryCode && countryCode.trim().length > 0) {
    namespace.push(countryCode.toLowerCase());
    tenantLowerCase += `-${countryCode.toLowerCase()}`;
  }
  namespace.push('txengine');

  return {
    NAMESPACE: namespace.join('-'),
    TENANT_NAME: tenantLowerCase,
    CONTAINER_IMAGE: image,
  };
};

const parseEnvironment = (environment, projectId) => {
  if (!environment) {
    return {};
  }
  return yaml.parse(environment.replace(/sm:\/\/\*\//g, `sm://${projectId}/`));
};

const getConditionalCountryCodeString = (countryCode) => (countryCode && countryCode.trim().length > 0 ? `${countryCode}_` : '');

const defaultEnvironment = (projectId, tenantName, countryCode) => ({
  DATABASE_HOST: `sm://${projectId}/${tenantName}_${getConditionalCountryCodeString(countryCode)}postgresql_private_address`,
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: `sm://${projectId}/${tenantName}_${getConditionalCountryCodeString(countryCode)}postgresql_master_password`,
  PGPASSWORD: `sm://${projectId}/${tenantName}_${getConditionalCountryCodeString(countryCode)}postgresql_master_password`,
  SERVICE_PROJECT_ID: projectId,
  SERVICE_ENVIRONMENT: projectId.includes('-staging-') ? 'staging' : 'prod',
  LAUNCH_DARKLY_ACCESS_KEY: `sm://${projectId}/launchdarkly-sdk-key`,
});

const loadAllSecrets = async (serviceAccountKey, secrets) => {
  const results = [];
  const resolvedSecrets = {};
  Object.entries(secrets).forEach(([name, value]) => {
    results.push(loadSecret(serviceAccountKey, value)
      .then((secret) => {
        resolvedSecrets[name] = secret;
      }).catch((err) => {
        throw new Error(`Failed to access secret '${value}'. Reason: ${err.message}`);
      }));
  });
  await Promise.all(results);
  return resolvedSecrets;
};

const prepareEnvConfig = async (
  deployServiceAccountKey,
  projectId,
  image,
  tenantName,
  countryCode,
  environmentString = '',
) => {
  const imageDigest = await getImageDigest(image);
  const replaceTokens = createReplaceTokens(projectId, imageDigest, tenantName, countryCode);
  const environment = {
    ...defaultEnvironment(projectId, tenantName.toLowerCase(), countryCode),
    ...parseEnvironment(environmentString, projectId),
  };

  const configMap = {};
  const secretsAsNames = {};
  Object.entries(environment).forEach(([name, value]) => {
    if (value.startsWith('sm://')) {
      if (!value.includes(projectId)) {
        throw new Error(`Secrets can only be loaded from target project: ${projectId}`);
      }
      secretsAsNames[name] = value.split('/').pop();
    } else {
      configMap[name] = value;
    }
  });

  const secrets = await loadAllSecrets(deployServiceAccountKey, secretsAsNames);

  return {
    replaceTokens,
    configMap,
    secrets,
  };
};

module.exports = prepareEnvConfig;
