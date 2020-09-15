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
    test('It throws for missing services', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
name: test
permissions:
  test:
    - verb
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance requires property "services"
`);
    });

    test('It throws for missing systems and permission-prefix', () => {
      mockFs({
        'iam.yaml': `
permissions:
  res:
    - verb
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance requires property "permission-prefix"
1: instance requires property "services"
`);
    });

    test('It throws for incorrect property name', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions: {}
roles:
  - id: admin
    name: test name
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
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions: 
  test:
    - test
roles:
  - id: admin
    name: admin name
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
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  test:
    - create
roles:
  - id: admin
    name: admin bla
    desc: Description that is to long
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0].desc does not meet maximum length of 20
`);
    });
  });
});
