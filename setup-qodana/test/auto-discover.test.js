const { root, createFiles, removeFiles } = require('./test-files');
const { projectType, autoDiscover } = require('../src/auto-discover');

afterEach(() => {
  removeFiles();
});

describe('auto-discover', () => {
  describe('dotnet', () => {
    test('It matches *.cs', () => {
      createFiles(['src/MyProject/Application.cs']);
      expect(autoDiscover(root)).toEqual(projectType.DOTNET);
    });
  });
  describe('node', () => {
    test('It matches package.json', () => {
      createFiles(['package.json']);
      expect(autoDiscover(root)).toEqual(projectType.NODE);
    });
    test('It matches yarn.lock', () => {
      createFiles(['yarn.lock']);
      expect(autoDiscover(root)).toEqual(projectType.NODE);
    });
  });
  describe('jvm', () => {
    test('It matches **/pom.xml', () => {
      createFiles(['modules/my-module/pom.xml']);
      expect(autoDiscover(root)).toEqual(projectType.JVM);
    });
    test('It matches pom.xml', () => {
      createFiles(['pom.xml']);
      expect(autoDiscover(root)).toEqual(projectType.JVM);
    });
    test('It matches build.gradle', () => {
      createFiles(['build.gradle']);
      expect(autoDiscover(root)).toEqual(projectType.JVM);
    });
  });
  describe('unknown', () => {
    test('It handles unknown', () => {
      createFiles([]);
      expect(autoDiscover(root)).toEqual(projectType.UNKNOWN);
    });
  });
});
