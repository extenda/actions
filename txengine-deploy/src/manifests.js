const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const axios = require('axios');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const getContent = async (url) =>
  axios({
    url,
    method: 'GET',
    headers: {
      'content-type': 'application/text',
    },
  })
    .then((response) => response.data)
    .catch((err) => {
      throw new Error(`Couldn't fetch file contents: ${err}`);
    });

const fetchFileContent = async (files) => {
  let content = '';

  for (let i = 0; i < files.length; i += 1) {
    content += await getContent(files[i].download_url);
  }

  return content;
};

const loadManifests = async (secretServiceAccountKey) => {
  const token = await loadSecret(secretServiceAccountKey, 'github-token');
  const octokit = github.getOctokit(token);
  return octokit.rest.repos
    .getContent({
      owner: 'extenda',
      repo: 'hiiretail-transaction-engine',
      path: '.k8s/txengine',
    })
    .then((response) => response.data)
    .then((files) => files.sort((a, b) => a.name.localeCompare(b.name)))
    .then((files) => fetchFileContent(files));
};

const replaceTokenVariables = (manifest, replaceTokens) => {
  let content = manifest;
  Object.entries(replaceTokens).forEach(([name, value]) => {
    content = content.replace(new RegExp(`\\$${name}`, 'g'), value);
  });
  return content;
};

const isDataMap = (doc, kind, suffix) =>
  doc.kind === kind && doc.metadata.name.endsWith(suffix);

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
) =>
  loadManifests(secretServiceAccountKey)
    .then((manifest) => replaceTokenVariables(manifest, replaceTokens))
    .then((manifest) =>
      yaml.parseAllDocuments(manifest).map((doc) => doc.toJSON()),
    )
    .then((docs) =>
      docs
        .map((doc) => {
          if (isDataMap(doc, 'ConfigMap', '-txengine-env')) {
            return populateDataMap(doc, 'data', configMap);
          }
          if (isDataMap(doc, 'Secret', '-txengine-secrets')) {
            return populateDataMap(doc, 'stringData', secrets);
          }
          return yaml.stringify(doc);
        })
        .join('---\n'),
    )
    .then((manifest) => `---\n${manifest}`)
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
    });

module.exports = createManifests;
