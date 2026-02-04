import { fs as memfs } from 'memfs';
import path from 'path';

// We access the global proxy state via the global object,
// or simpler: just check if we are in a 'mock-fs' context by checking memfs content.
// But to match your existing logic, we'll try to use the global proxy flag if possible,
// or just default to ALWAYS scanning memfs if it has files.

const fastGlobMock = {
  sync: (patterns, options = {}) => {
    const baseDir = options.cwd ? path.resolve(options.cwd) : process.cwd();

    // console.log(`[FastGlob Mock] Scanning: ${baseDir} for ${patterns}`);

    const results = [];

    const walk = (dir) => {
      if (!memfs.existsSync(dir)) return;

      let entries;
      try {
        entries = memfs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const patternString = Array.isArray(patterns)
            ? patterns[0]
            : patterns;
          // Simple extension matching
          const ext = path.extname(patternString.replace(/\*/g, 'a'));

          if (fullPath.endsWith(ext)) {
            results.push(path.relative(baseDir, fullPath));
          }
        }
      }
    };

    walk(baseDir);
    return results;
  },
};

export default fastGlobMock;
export const sync = fastGlobMock.sync;
