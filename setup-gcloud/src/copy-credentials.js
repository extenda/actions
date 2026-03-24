import path from 'node:path';

import * as io from '@actions/io';
import { v4 as uuid } from 'uuid';

/**
 * Copy the credentials file outside the working directory. We want to store
 * in a directory that is hard to accidentally include in docker contexts or
 * gcloud tarballs.
 *
 * @param tmpKeyFile the temporary credentials key file
 * @returns {Promise<string|*>} the path to the created credentials file
 */
export default async function copyCredentials(tmpKeyFile) {
  if (!process.env.RUNNER_TEMP) {
    return tmpKeyFile;
  }
  const dest = path.join(process.env.RUNNER_TEMP, uuid());
  return io.cp(tmpKeyFile, dest).then(() => dest);
}
