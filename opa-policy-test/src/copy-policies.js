import fs from 'node:fs';
import path from 'node:path';

const copyPolicies = (testBundlePath) => {
  fs.cpSync(
    path.join('policies', 'policy'),
    path.join(testBundlePath, 'policy'),
    { recursive: true },
  );
};

export default copyPolicies;
