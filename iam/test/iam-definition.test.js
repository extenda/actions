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

    test('It validates a valid YAML file', () => {
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
    name: Test Admin
    desc: The test admin role
    permissions:
      - test.create
`,
      });
      expect(loadIamDefinition('iam.yaml')).toMatchObject({
        'permission-prefix': 'tst',
      });
    });
  });

  describe('Alpha sorting', () => {
    test('It fails on out-of-order permission nouns', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  alpha:
    - alpha
  test:
    - create
  beta:
    - beta
roles:
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - test.alpha
      - test.create
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions[1] is not sorted alphabetically
`);
    });

    test('It fails on out-of-order permission verbs', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  alpha:
    - beta
    - alpha
  beta:
    - alpha
    - zed
    - beta
roles:
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - test.alpha
      - test.create
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions.alpha[0] is not sorted alphabetically
1: instance.permissions.alpha[1] is not sorted alphabetically
2: instance.permissions.beta[1] is not sorted alphabetically
3: instance.permissions.beta[2] is not sorted alphabetically
`);
    });

    test('It fails on out-of-order roles IDs', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  alpha:
    - alpha
    - beta
  beta:
    - alpha
    - beta
roles:
  - id: test
    name: Test Test
    desc: ''
    permissions:
      - alpha.alpha
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - alpha.alpha
      - alpha.beta
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0] is not sorted alphabetically
1: instance.roles[1] is not sorted alphabetically
`);
    });

    test('It fails on out-of-order role permissions', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  alpha:
    - alpha
    - beta
  beta:
    - alpha
    - beta
roles:
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - alpha.alpha
      - beta.alpha
      - alpha.beta
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0].permissions[1] is not sorted alphabetically
`);
    });

    test('It fails on out-of-order service names', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
  - name: alpha
    repository: actions
permissions:
  alpha:
    - alpha
    - beta
  beta:
    - alpha
    - beta
roles:
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - alpha.alpha
      - alpha.beta
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.services[0] is not sorted alphabetically
1: instance.services[1] is not sorted alphabetically
`);
    });

    test('It can fail on both sorting and schema', () => {
      mockFs({
        'iam.yaml': `
#permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  alpha:
    - alpha
    - beta
  beta:
    - alpha
    - beta
roles:
  - id: admin
    name: Test Admin
    desc: The test admin role
    permissions:
      - beta.alpha
      - alpha.alpha
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance requires property "permission-prefix"
1: instance.roles[0].permissions[0] is not sorted alphabetically
2: instance.roles[0].permissions[1] is not sorted alphabetically
`);
    });
  });
});
