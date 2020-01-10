const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('@actions/exec');
// const { loadTool } = require('../../utils');
const axios = require('axios');
const { promisify } = require('util');

const BINARY_NAME = os.platform() !== 'win32'
  ? 'InstallerPackageBuilder.Core.Console'
  : 'InstallerPackageBuilder.Core.Console.exe';

const packageBuilderCommand = async (builder, args) => {
  const {
    btype,
    packageName,
    workingDir,
    outputDir,
    sourcePaths,
    sourceFilePaths,
  } = args;

  return exec.exec(
    builder,
    [
      btype,
      '-pn', packageName,
      '-wd', workingDir,
      '-od', outputDir,
      '-sp', sourcePaths,
      '-sfp', sourceFilePaths,
    ],
  );
};

// const http = require('http');

// const download = (url, dest, cb) => {
//   const file = fs.createWriteStream(dest);
//   const { NEXUS_USERNAME, NEXUS_PASSWORD } = process.env;
//   //const auth = Buffer.from(`${NEXUS_USERNAME}:${NEXUS_PASSWORD}`).toString('base64');
//   const auth = `${NEXUS_USERNAME}:${NEXUS_PASSWORD}`;
//
//   http.get(url, { auth }, (response) => {
//     response.pipe(file);
//     file.on('finish', () => {
//       file.close(cb); // close() is async, call cb after close completes.
//     });
//   }).on('error', (err) => {
//     fs.unlink(dest); // Delete the file async. (But we don't check the result)
//     cb(err.message);
//   });
// };

const loadTool = async ({ binaryVersion, outputDir }) => {
  // FIXME: I haven't got this working yet. The stream never fires any completion events. I'm just too bad at async JS :(

  const appName = 'RS.InstallerPackageBuilder.Core.Console';

  const buildTool = path.join(outputDir, BINARY_NAME);
  const stream = fs.createWriteStream(buildTool);
  // TODO Check if file exists and reuse in that case.

  console.log(`https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${BINARY_NAME}`)

  const url = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${BINARY_NAME}`;

  // await new Promise((resolve, reject) => {
  //   download(url, buildTool, resolve, reject);
  // });


  const response = await axios.get(
    `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${BINARY_NAME}`,
    {
      auth: {
        username: process.env.NEXUS_USERNAME,
        password: process.env.NEXUS_PASSWORD,
      },
      responseType: 'stream',
    },
  );

  console.log('Got response');

  //fs.writeFileSync(buildTool, response.data);

  console.log('Wait for pipe');
  //
  // stream.on('open', () => {
  //   console.log('Start streaming!');
  //   response.data.pipe(stream);
  // });

  const p = new Promise((resolve, reject) => {
    stream.on('close', resolve);
    stream.on('error', reject);
    stream.on('data', () => { console.log('Data'); });
  });

  response.data.pipe(stream);

  await p;

  console.log('CHMOD');
  fs.accessSync(buildTool, 777);

  console.log('Downloaded', buildTool);

  return buildTool;
};

const buildPackage = async (args) => {
  const buildTool = await loadTool(args);
  return packageBuilderCommand(buildTool, args);
};

module.exports = buildPackage;
