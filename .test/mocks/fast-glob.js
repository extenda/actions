import { fs as memfs } from 'memfs';
import micromatch from 'micromatch';
import path from 'path';

const fastGlobMock = {
  sync: (patterns, options = {}) => {
    const baseDir = options.cwd ? path.resolve(options.cwd) : process.cwd();
    const results = [];

    // Default fast-glob behavior: onlyFiles is true unless onlyDirectories is true
    const onlyDirectories = options.onlyDirectories || false;
    const onlyFiles = !onlyDirectories && options.onlyFiles !== false;

    const walk = (dir) => {
      if (!memfs.existsSync(dir)) {
        return;
      }

      let entries;
      try {
        entries = memfs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const isDirectory = entry.isDirectory();

        // 1. Normalize path for matching
        let relativePath = path.relative(baseDir, fullPath);
        if (path.sep === '\\') {
          relativePath = relativePath.split(path.sep).join('/');
        }

        // 2. Check strict type constraints BEFORE matching pattern
        // (Optimization: don't run regex if type is wrong)
        let typeMatch = false;
        if (onlyDirectories && isDirectory) typeMatch = true;
        if (onlyFiles && !isDirectory) typeMatch = true;
        if (!onlyDirectories && !onlyFiles) typeMatch = true; // Return everything

        // 3. If type matches, check the glob pattern
        if (typeMatch) {
          if (micromatch.isMatch(relativePath, patterns, { dot: true })) {
            results.push(relativePath);
          }
        }

        // 4. Always recurse into directories to find nested matches
        if (isDirectory) {
          walk(fullPath);
        }
      }
    };

    walk(baseDir);
    return results;
  },
};

export default fastGlobMock;
export const sync = fastGlobMock.sync;
export const globSync = fastGlobMock.sync;
