const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const core = require('@actions/core');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const logAndReturn = async (returnValue, log) => {
  core.startGroup(log);
  core.info(JSON.stringify(returnValue));
  core.endGroup();
  return returnValue;
};

const loadManifests = async (secretServiceAccountKey) => {
  const token = await loadSecret(secretServiceAccountKey, 'github-token');
  const octokit = github.getOctokit(token);
  core.info('token fetched!');
  return octokit.repos.getContent({
    owner: 'extenda',
    repo: 'hiiretail-transaction-engine',
    path: '.k8s',
  })
    .then((returnValue) => logAndReturn(returnValue, 'get content response'))
    .then((response) => response.data)
    .then((returnValue) => logAndReturn(returnValue, 'get response data'))
    .then((files) => files.sort((a, b) => a.name.localeCompare(b.name)))
    .then((returnValue) => logAndReturn(returnValue, 'sort files done'))
    .then((files) => files.map((e) => Buffer.from(e.content, 'base64').toString('utf8')))
    .then((returnValue) => logAndReturn(returnValue, 'map files done'))
    .then((contents) => contents.join('\n'));
};

const replaceTokenVariables = (manifest, replaceTokens) => {
  let content = manifest;
  Object.entries(replaceTokens).forEach(([name, value]) => {
    content = content.replace(
      new RegExp(`\\$${name}`, 'g'),
      value,
    );
  });
  return content;
};

const isDataMap = (doc, kind, suffix) => doc.kind === kind && doc.metadata.name.endsWith(suffix);

const populateDataMap = (doc, propName, dataMap) => {
  const update = doc;
  update[propName] = {
    ...doc[propName],
    ...dataMap,
  };
  return yaml.stringify(update);
};

const createManifests = async (
  secretServiceAccountKey,
  { replaceTokens, configMap, secrets },
) => loadManifests(secretServiceAccountKey)
  .then((manifest) => replaceTokenVariables(manifest, replaceTokens))
  .then((returnValue) => logAndReturn(returnValue, 'replace token vars'))
  .then((manifest) => yaml.parseAllDocuments(manifest).map((doc) => doc.toJSON()))
  .then((returnValue) => logAndReturn(returnValue, 'parse documents'))
  .then((docs) => docs.map((doc) => {
    if (isDataMap(doc, 'ConfigMap', '-txengine-env')) {
      return populateDataMap(doc, 'data', configMap);
    }
    if (isDataMap(doc, 'Secret', '-txengine-secrets')) {
      return populateDataMap(doc, 'stringData', secrets);
    }
    return yaml.stringify(doc);
  }).join('---\n'))
  .then((returnValue) => logAndReturn(returnValue, 'map documents'))
  .then((manifest) => `---\n${manifest}`)
  .then((returnValue) => logAndReturn(returnValue, 'add --- to document'))
  .then((manifest) => {
    const outputDir = path.join('.k8s', 'generated');
    const outputFile = path.join(outputDir, '00-manifest.yaml');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, manifest, 'utf8');
    return {
      file: outputFile,
      content: manifest,
      namespace: replaceTokens.NAMESPACE,
      tenantName: replaceTokens.TENANT_NAME,
    };
  })
  .then((returnValue) => logAndReturn(returnValue, 'generate documents'));

module.exports = createManifests;
