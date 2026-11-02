import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import axios from 'axios';
import os from 'os';
import { v4 as uuid } from 'uuid';

const find = async ({ tool, binary, version }) =>
  Promise.resolve(tc.find(tool, version) /* process.arch), */).then((dir) =>
    dir ? path.join(dir, binary) : '',
  );

const downloadToolWithAuth = async (url, auth) => {
  const targetFile = path.join(os.tmpdir(), uuid(), uuid());
  fs.mkdirSync(path.dirname(targetFile));
  const stream = fs.createWriteStream(targetFile);
  await axios({
    url,
    method: 'get',
    auth,
    responseType: 'stream',
  })
    .then((response) => {
      core.info(`Loading ${response.headers['content-length'] / 1000} KB...`);
      response.data.pipe(stream);
      return new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    })
    .then(() => {
      core.info(`Binary saved to ${targetFile}`);
      fs.chmodSync(targetFile, '0777');
    });
  return targetFile;
};

const internalDownload = async (url, auth) =>
  auth ? downloadToolWithAuth(url, auth) : tc.downloadTool(url);

const downloadIfMissing = async (options, cachedTool) => {
  if (!cachedTool) {
    const { tool, binary, version, downloadUrl, auth } = options;
    core.info(`Downloading ${tool} from ${downloadUrl}`);
    const downloadUuid = await internalDownload(downloadUrl, auth);

    // Extract into our own private scratch directory rather than wherever the
    // download itself landed: tc.downloadTool() (the non-auth path) saves its
    // file directly inside the *shared* RUNNER_TEMP directory, not a dedicated
    // subdirectory, so path.dirname(downloadUuid) can be RUNNER_TEMP itself.
    // That directory also holds the runner's own per-step bookkeeping files
    // (e.g. _runner_file_commands/*), so it must never be wholesale deleted.
    const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'action-utils-'));

    if (downloadUrl.endsWith('.tar.gz')) {
      await tc.extractTar(downloadUuid, scratchDir);
    } else if (downloadUrl.endsWith('.zip')) {
      await tc.extractZip(downloadUuid, scratchDir);
    } else if (downloadUrl.endsWith('.7z')) {
      await tc.extract7z(downloadUuid, scratchDir);
    } else {
      // Raw file
      const tmpFile = path.join(scratchDir, binary);
      await io.cp(downloadUuid, tmpFile);
      fs.chmodSync(tmpFile, '0777');
    }
    fs.rmSync(downloadUuid, { force: true });

    // tc.cacheDir() copies (not moves) scratchDir's contents into
    // RUNNER_TOOL_CACHE, so without this the extracted tree is left behind on
    // the runner disk for the rest of the job (doubling disk usage for large
    // tools like the gcloud SDK, which has filled runner disks to the point of
    // "no space left on device" failures). Clean up in `finally` so a failed
    // cacheDir() (e.g. itself hitting ENOSPC) still releases the scratch copy.
    try {
      await tc.cacheDir(scratchDir, tool, version);
    } finally {
      await io.rmRF(scratchDir);
    }
    return find(options);
  }
  return cachedTool;
};

/**
 * Load a tool binary, downloading and caching it if necessary.
 * @param tool the tool to install
 * @param binary the binary to add to PATH (e.g. terraform.exe on Windows)
 * @param version the tool version
 * @param downloadUrl the download URL
 * @param auth optional authentication for downloading the tool (e.g. { username, password } for basic auth)
 * @return {Promise<string>} Path to the binary
 */
const loadTool = async ({ tool, binary, version, downloadUrl, auth }) => {
  const options = {
    tool,
    binary,
    version,
    downloadUrl,
    auth,
  };
  return find(options).then((cachedTool) =>
    downloadIfMissing(options, cachedTool),
  );
};

export { find, loadTool };
