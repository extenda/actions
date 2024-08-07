const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs');

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const installRedoc = async () =>
  exec.exec('sudo', ['npm', 'install', 'redoc-cli', '-global'], {
    silent: true,
  });

const buildApiDocs = async (openApiYaml, apiName, systemName, version) =>
  exec.exec(
    'redoc-cli',
    [
      'bundle',
      openApiYaml,
      '-o',
      `${systemName}/${apiName}/${version}/index.html`,
      '--options.nativeScrollbars',
      '--options.hideSingleRequestSampleTab',
      '--options.onlyRequiredInSamples',
      '--options.sortPropsAlphabetically',
      '--cdn',
    ],
    {
      silent: true,
    },
  );

const uploadApiDocs = async (bucket, systemName) =>
  exec.exec('gsutil', ['cp', '-r', `${systemName}`, `${bucket}systems/`], {
    silent: true,
  });

const updateIndex = async (file, addToIndex, title) => {
  const index = `<html>
<title>extenda retail</title>
<table style="width:50%;margin-left:auto;margin-right:auto;">
  <tr>
    <th>${title}</th>
  </tr>
  ThisWillBeAutoGenerated
</table>
</html>`;
  const result = index.replace(/ThisWillBeAutoGenerated/g, addToIndex);

  fs.writeFile(file, result, 'utf8', (err) => {
    if (err) {
      core.error(err);
    }
  });
};

const uploadIndex = async (fileToUpload, uploadLocation) =>
  exec.exec('gsutil', ['cp', fileToUpload, `${uploadLocation}index.html`], {
    silent: true,
  });

const fetchDirList = async (folder) => {
  let output = '';
  await exec.exec('gsutil', ['ls', `${folder}`], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  return output.trim().split(/[\r\n]+/);
};

const buildIndex = async (apiList, rootFolder, bucket) => {
  let addToIndex = '';
  apiList.forEach((line) => {
    if (line !== rootFolder && !line.endsWith('index.html')) {
      const indexLocation = line.substr(bucket.length);
      const linkDisplayName = line.substr(rootFolder.length).slice(0, -1);
      addToIndex += `<tr>
      <td style="text-align:center;"><a href=/${indexLocation}index.html>${linkDisplayName}</a></td>
    </tr>
      `;
    }
  });
  return addToIndex;
};

const setMetadata = async (folder) =>
  exec.exec(
    'gsutil',
    [
      'setmeta',
      '-h',
      'Cache-Control:no-store, max-age=0',
      `${folder}index.html`,
    ],
    {
      silent: true,
    },
  );

const buildAndUploadIndex = async (folder, preFolder, title, bucket) => {
  await fetchDirList(folder).then((linkList) =>
    buildIndex(linkList, folder, bucket).then((addToIndex) =>
      updateIndex(`${title}index.html`, addToIndex, title).then(
        uploadIndex(`${title}index.html`, preFolder),
      ),
    ),
  );
};

const deployDocumentation = async (
  yaml,
  apiName,
  version,
  bucket,
  systemName,
) => {
  core.info(`Uploading api documentation for ${apiName}:${version}`);
  const systemsFolder = `${bucket}systems/`;
  const systemNameFolder = `${systemsFolder}${systemName}/`;
  const apiFolder = `${systemNameFolder}${apiName}/`;

  const systemsTitle = 'Systems';
  const apiTitle = 'APIs';
  const versionTitle = 'Versions';

  const promises = [];
  await installRedoc();
  await buildApiDocs(yaml, apiName, systemName, version);
  await uploadApiDocs(bucket, systemName);

  promises.push(
    buildAndUploadIndex(systemsFolder, bucket, systemsTitle, bucket),
  );
  promises.push(
    buildAndUploadIndex(systemNameFolder, systemNameFolder, apiTitle, bucket),
  );
  promises.push(
    buildAndUploadIndex(apiFolder, apiFolder, versionTitle, bucket),
  );

  await Promise.all(promises);

  await wait(2000);
  promises.push(setMetadata(bucket));
  promises.push(setMetadata(systemNameFolder));
  promises.push(setMetadata(apiFolder));

  await Promise.all(promises);
};

module.exports = deployDocumentation;
