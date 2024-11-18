const { root, createFiles, removeFiles } = require('./test-files');
const coverageDirectory = require('../src/coverage-dir');
const { projectType } = require('../src/auto-discover');

afterEach(() => {
  removeFiles();
});

describe('coverage-dir', () => {
  describe('node', () => {
    test('It finds coverage/lcov.info', () => {
      createFiles([
        'coverage/lcov.info',
        'coverage/jest/lcov.info',
        'src/index.js',
      ]);

      const coverageDir = coverageDirectory(projectType.NODE, root);
      expect(coverageDir).toEqual('coverage');
    });
    test('No coverage exists', () => {
      const coverageDir = coverageDirectory(projectType.NODE, root);
      expect(coverageDir).toEqual('');
    });
  });
  describe('dotnet', () => {
    test('It finds src', () => {
      createFiles([
        'src/MyProject1/build/coverage/lcov.info',
        'src/MyProject2/build/coverage/lcov.info',
        'src/MyProject2/build/coverage/sub/lcov.info',
      ]);
      const coverageDir = coverageDirectory(projectType.NODE, root);
      expect(coverageDir).toEqual('src');
    });
  });
  describe('jvm', () => {
    test('It finds jacoco', () => {
      createFiles(['target/site/jacoco/jacoco.xml']);
      const coverageDir = coverageDirectory(projectType.JVM, root);
      expect(coverageDir).toEqual('target/site/jacoco');
    });
    test('It prefers jacoco-aggregate over jacoco', () => {
      createFiles([
        'module/target/site/jacoco/jacoco.xml',
        'bundle/target/site/jacoco-aggregate/jacoco.xml',
      ]);
      const coverageDir = coverageDirectory(projectType.JVM, root);
      expect(coverageDir).toEqual('bundle/target/site/jacoco-aggregate');
    });
  });
  describe('unknown', () => {
    test('No coverage for unknown', () => {
      const coverageDir = coverageDirectory('unknown', root);
      expect(coverageDir).toEqual('');
    });
  });
});
