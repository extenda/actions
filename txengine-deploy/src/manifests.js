const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
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

const replaceVariables = (manifest, vars) => {
  let result = manifest;
  Object.keys(vars).forEach((name) => {
    result = result.replace(new RegExp(`\\$${name}`, 'g'), vars[name]);
  });
  return result;
};

const createManifests = async (
  secretServiceAccountKey,
  vars,
) => loadManifests(secretServiceAccountKey)
  .then((manifest) => replaceVariables(manifest, vars))
  .then((manifest) => {
    const outputDir = path.join('.k8s', 'generated');
    const outputFile = path.join(outputDir, '00-manifest.yaml');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, manifest, 'utf8');
    return {
      file: outputFile,
      content: manifest,
      namespace: vars.NAMESPACE,
    };
  });

module.exports = createManifests;
