const mockFs = require('mock-fs');
const { m } = require('multiline-str');
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


  // Uncomment test to allow yaml without
  describe('Schema validation', () => {
//     test('It throws for missing services', () => {
//       mockFs({
//         'iam.yaml': `
// permission-prefix: tst
// name: test
// permissions:
//   test:
//     - verb
// `,
//       });
//       expect(() => loadIamDefinition('iam.yaml'))
//         .toThrow(`iam.yaml is not valid.
// 0: instance requires property "services"
// `);
//     });

    test('It throws for missing permission-prefix', () => {
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
1: instance.roles[0] is not allowed to have the additional property "description"
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
    desc: A description description description description description description description description description description description description description description description longer than 200 characters
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.roles[0].desc does not meet maximum length of 200
`);
    });

    test('It throws for invalid permission-prefix', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: in1
services:
  - name: test
    repository: actions
permissions:
  test:
    - test
roles:
  - id: admin
    name: admin name
    desc: A description
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permission-prefix does not match pattern "^[a-z][-a-z]{2}$"
`);
    });

    test('It throws for invalid permission resource', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  test1:
    - test
roles:
  - id: admin
    name: admin name
    desc: A description
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions does not match pattern "^[a-z][-a-z]{1,15}$"
`);
    });

    test('It throws for invalid permission verb', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  test:
    - test1
roles:
  - id: admin
    name: admin name
    desc: A description
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions.test[0] is not exactly one from [subschema 0],[subschema 1]
`);
    });

    test('It throws for invalid permission with alias', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
  - name: test
    repository: actions
permissions:
  test:
    - id: alias
      alias: ${'a'.repeat(257)}
roles:
  - id: admin
    name: admin name
    desc: A description
    permissions: []
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.permissions.test[0] is not exactly one from [subschema 0],[subschema 1]
`);
    });

    test('It allows settings permission description', () => {
      mockFs({
        'iam.yaml': m`
            permission-prefix: tst
            services:
              - name: test
                repository: actions
            permissions:
              test:
                - id: action
                  description: Perform some action
            roles:
              - id: admin
                name: admin name
                desc: A description
                permissions: []
            `,
      });

      expect(loadIamDefinition('iam.yaml')).toStrictEqual({
        'permission-prefix': 'tst',
        permissions: {
          test: [
            {
              id: 'action',
              description: 'Perform some action',
            },
          ],
        },
        roles: [
          {
            id: 'admin',
            name: 'admin name',
            desc: 'A description',
            permissions: [],
          },
        ],
        services: [
          {
            name: 'test',
            repository: 'actions',
          },
        ],
      });
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
    - id: delete
      alias: delete
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

    test('It can fail on consumer alphabetical order', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
- name: test
  repository: actions
  allowed-consumers:
    - clan: clan
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
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
0: instance.services[0]['allowed-consumers'][0]['service-accounts'][0] is not sorted alphabetically
1: instance.services[0]['allowed-consumers'][0]['service-accounts'][1] is not sorted alphabetically
2: instance.roles[0].permissions[0] is not sorted alphabetically
3: instance.roles[0].permissions[1] is not sorted alphabetically`);
    });

    test('It can fail on consumer alphabetical order with more allowed consumer clans', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
- name: test
  repository: actions
  allowed-consumers:
    - clan: clan
      service-accounts:
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
    - clan: clan
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
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
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.services[0]['allowed-consumers'][1]['service-accounts'][0] is not sorted alphabetically
1: instance.services[0]['allowed-consumers'][1]['service-accounts'][1] is not sorted alphabetically`);
    });
    test('It can fail on consumer alphabetical order across several services', () => {
      mockFs({
        'iam.yaml': `
permission-prefix: tst
services:
- name: test
  repository: actions
  allowed-consumers:
    - clan: clan
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
- name: test1
  repository: actions1
  allowed-consumers:
    - clan: clan1
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
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
`,
      });
      expect(() => loadIamDefinition('iam.yaml'))
        .toThrow(`iam.yaml is not valid.
0: instance.services[0]['allowed-consumers'][0]['service-accounts'][0] is not sorted alphabetically
1: instance.services[0]['allowed-consumers'][0]['service-accounts'][1] is not sorted alphabetically
2: instance.services[1]['allowed-consumers'][0]['service-accounts'][0] is not sorted alphabetically
3: instance.services[1]['allowed-consumers'][0]['service-accounts'][1] is not sorted alphabetically`);
    });
  });
});
