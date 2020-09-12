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

    test('It throws for incorrect property name', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: test
systems:
  - namespace: test
    repository: actions
permissions: {}
roles:
  - name: admin
    description: Should be desc
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0] requires property "desc"
1: instance.roles[0] additionalProperty "description" exists in instance when not allowed
`);
    });

    test('It throws for too long desc', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: test
systems:
  - namespace: test
    repository: actions
permissions: {}
roles:
  - name: admin
    desc: A description longer than 20 characters
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0].desc does not meet maximum length of 20
`);
    });

    test('It throws for too long permission description', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: test
systems:
  - namespace: test
    repository: actions
permissions:
  test:
    create: A description longer than 20 characters
roles:
  - name: admin
    desc: Description
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions.test.create does not meet maximum length of 20
`);
    });
  });
});
