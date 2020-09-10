const mockFs = require('mock-fs');
const loadIamDefinition = require('../src/iam-definition');

describe('IAM Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  test('It throws for file not found', () => {
    mockFs({});
    expect(() => loadIamDefinition('iam.yaml'))
      .toThrow('iam specification file not found: iam.yaml');
  });

  describe('Schema validation', () => {
    test('It throws for missing system', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: test
systems:
  - namespace: test-space
    repository: test-repo
permissions:
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions is not of a type(s) object`);
    });

    test('It throws for missing systems and permission-prefix', () => {
      mockFs({
        'iam.yaml': `
permissions:
  res:
    verb: descr
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance requires property "permission-prefix"
1: instance requires property "systems"
`);
    });
  });
});
