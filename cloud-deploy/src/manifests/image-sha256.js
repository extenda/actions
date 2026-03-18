import { authenticateDocker } from '../../../trivy-scan/src/index.js';
import { getImageDigest } from '../../../utils/src/index.js';

const getImageWithSha256 = async (semanticImage) => {
  await authenticateDocker(semanticImage);
  return await getImageDigest(semanticImage);
};

export default getImageWithSha256;
