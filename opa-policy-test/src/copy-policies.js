import fs from 'fs';
import path from 'path';

const copyPolicies = (testBundlePath) => {
  fs.cpSync(
    path.join('policies', 'policy'),
    path.join(testBundlePath, 'policy'),
    { recursive: true },
  );
};

module.exports = copyPolicies;
