const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const loadManifests = async (secretServiceAccountKey) => {
  const token = await loadSecret(secretServiceAccountKey, 'github-token');
  const octokit = github.getOctokit(token);
  return octokit.repos.getContent({
    owner: 'extenda',
    repo: 'hiiretail-transaction-engine',
    path: '.k8s',
  }).then((response) => response.data)
    .then((files) => files.sort((a, b) => a.name.localeCompare(b.name)))
    .then((files) => files.map((e) => Buffer.from(e.content, 'base64').toString('utf8')))
    .then((contents) => contents.join('\n'));
};

const replaceVariables = (manifest, defaultEnvironment, additionalEnvironment) => {
  let result = manifest;
  Object.entries(defaultEnvironment).forEach(([key, value]) => {
    result = result.replace(
      new RegExp(`\\$${key}`, 'g'),
      value,
    );
  });

  const environment = { ...defaultEnvironment, ...additionalEnvironment };
  delete environment.NAMESPACE;
  delete environment.CONTAINER_IMAGE;

  result = yaml.parseAllDocuments(result).map((doc) => {
    const data = doc.toJSON();
    if (data.kind === 'statefulset') {
      const container = data.spec.template.spec.containers[0];
      if (!container.env) {
        container.env = [];
      }
      container.env = [
        ...container.env,
        ...Object.entries(environment).map(([name, value]) => ({ name, value }))];
    }
    return yaml.stringify(data);
  }).join('---\n');

  return `---\n${result}`;
};

const createManifests = async (
  secretServiceAccountKey,
  defaultEnvironment,
  additionalEnvironment = {},
) => loadManifests(secretServiceAccountKey)
  .then((manifest) => replaceVariables(manifest, defaultEnvironment, additionalEnvironment))
  .then((manifest) => {
    const outputDir = path.join('.k8s', 'generated');
    const outputFile = path.join(outputDir, '00-manifest.yaml');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, manifest, 'utf8');
    return {
      file: outputFile,
      content: manifest,
      namespace: defaultEnvironment.NAMESPACE,
    };
  });

module.exports = createManifests;
