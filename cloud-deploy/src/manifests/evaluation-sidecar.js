import getImageWithSha256 from './image-sha256.js';

const IMAGE_NAME = 'eu.gcr.io/extenda/entity-conditions-evaluation-sidecar';

// The image is not semantically versioned; `stable` is a moving tag
// maintained by the image owners for the generally available release.
export const STABLE_TAG = 'stable';

const SECRETS_PROJECT = 'extenda';

// Cross-project Cloud Run secrets are aliased via the `run.googleapis.com/secrets`
// annotation, which requires the numeric project number (not the project ID).
// See https://docs.cloud.google.com/run/docs/configuring/services/secrets
const SECRETS_PROJECT_NUMBER = '377710398576';

const DEFAULT_ENV = {
  OCMS_CLIENT_ID: `sm://${SECRETS_PROJECT}/ecs-api-ocms-client-id`,
  OCMS_CLIENT_SECRET: `sm://${SECRETS_PROJECT}/ecs-api-ocms-client-secret`,
  REQUEST_ALL_BUNDLE: 'false',
};

const imageTag = (version = null) =>
  process.env.EVALUATION_IMAGE_TAG || version || STABLE_TAG;

const resolveImage = async (version = null) =>
  getImageWithSha256(`${IMAGE_NAME}:${imageTag(version)}`);

// Resolves one env entry. Cloud Run resolves a same-project secret via a
// bare `secretKeyRef.name`. A secret in another project can't be referenced
// directly in `secretKeyRef.name` - it must be declared as an alias in the
// `run.googleapis.com/secrets` annotation (`alias:projects/NUMBER/secrets/NAME`),
// and `secretKeyRef.name` then points at that alias.
const resolveEnvVar = (name, rawValue, platformGKE, projectId) => {
  // Matches the `sm://*/secret-name` convention used elsewhere in
  // cloud-deploy.yaml: `*` means "the deploying service's own project".
  const value = `${rawValue}`.replace('sm://*/', `sm://${projectId}/`);
  if (!value.startsWith('sm://')) {
    return { env: { name, value } };
  }
  if (platformGKE) {
    // GKE relies on Berglas to resolve `sm://` references at container
    // startup, which accepts the project ID directly.
    return { env: { name, value } };
  }

  const [, , secretProject, secretName] = value.split('/');
  if (secretProject === projectId) {
    return {
      env: {
        name,
        valueFrom: { secretKeyRef: { key: 'latest', name: secretName } },
      },
    };
  }

  const projectRef =
    secretProject === SECRETS_PROJECT ? SECRETS_PROJECT_NUMBER : secretProject;
  return {
    env: {
      name,
      valueFrom: { secretKeyRef: { key: 'latest', name: secretName } },
    },
    secretAlias: `${secretName}:projects/${projectRef}/secrets/${secretName}`,
  };
};

const evaluationSpec = async (projectId, platformGKE, config = {}) => {
  const { version = null, env = {} } = config;
  const envConfig = { ...DEFAULT_ENV, ...env };
  const image = await resolveImage(version);

  const resolved = Object.entries(envConfig).map(([name, value]) =>
    resolveEnvVar(name, value, platformGKE, projectId),
  );

  return {
    container: {
      name: 'evaluation',
      image,
      env: resolved.map(({ env: envVar }) => envVar),
    },
    // Cross-project secret aliases to merge into the `run.googleapis.com/secrets`
    // annotation. Always empty on GKE.
    secretAliases: resolved
      .map(({ secretAlias }) => secretAlias)
      .filter(Boolean),
  };
};

export { evaluationSpec };
