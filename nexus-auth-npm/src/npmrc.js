import { writeFile } from 'fs';
import { join } from 'path';

/**
 * @param {{
 *   credentials: {
 *     username: string,
 *     password: string,
 *   },
 *   outputDir: string,
 *   authForPublishing?: boolean,
 * }}
 */
const createNpmrcFile = async ({
  credentials: { username, password },
  authForPublishing,
  outputDir,
}) => {
  const nexusToken = Buffer.from(`${username}:${password}`).toString('base64');
  const repo = authForPublishing ? 'npm-private' : 'npm-group';
  const contents = `
@hiiretail:registry = https://repo.extendaretail.com/repository/${repo}/
//repo.extendaretail.com/repository/${repo}/:email = nexus@extenda.com
//repo.extendaretail.com/repository/${repo}/:always-auth = true
//repo.extendaretail.com/repository/${repo}/:_auth = ${nexusToken}
`;
  await writeFile(join(outputDir, '.npmrc'), contents);
};

export { createNpmrcFile };
