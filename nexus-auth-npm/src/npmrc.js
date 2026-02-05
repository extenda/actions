import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
export const createNpmrcFile = ({
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
  writeFileSync(join(outputDir, '.npmrc'), contents);
};
