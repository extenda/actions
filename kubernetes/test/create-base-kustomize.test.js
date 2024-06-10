const mockFs = require('mock-fs');
const fs = require('fs');

const createBaseKustomize = require('../src/create-base-kustomize');

describe('Creates base kustomize yaml files', () => {
  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
  });

  test('It creates correct yml files', () => {
    createBaseKustomize();

    expect(fs.existsSync('kustomize/deployment.yml')).toEqual(true);
    expect(fs.existsSync('kustomize/statefulSet.yml')).toEqual(true);
    expect(fs.existsSync('kustomize/configmap.yml')).toEqual(true);
    expect(fs.existsSync('kustomize/kustomization.yml')).toEqual(true);
  });
});
