const mockFs = require('mock-fs');
const loadGroupTypeDefinition = require('../src/grouptype-definition');

describe('Grouptype Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  test('It throws for file not found', () => {
    mockFs({});
    expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
      .toThrow('grouptype specification file not found: grouptypes.yaml');
  });

  describe('Schema validation', () => {
    test('It throws for missing grouptypes', () => {
      mockFs({
        'grouptypes.yaml': `
  name: test
  repository: bum-repo`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance requires property "grouptypes"`);
    });

    test('It throws for missing name and repository', () => {
      mockFs({
        'grouptypes.yaml': `
  grouptypes:
  - id: price
    name: price name
    description: Should be description`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance requires property "name"
1: instance requires property "repository"`);
    });

    test('It throws for incorrect property name', () => {
      mockFs({
        'grouptypes.yaml': `
name: test
repository: bum-repo
grouptypes:
  - id: admin
    name: test name
    description: Should be description
    custom: My own property`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0] is not allowed to have the additional property "custom"
`);
    });

    test('It throws for too long description', () => {
      mockFs({
        'grouptypes.yaml': `
name: test
repository: bum-repo
grouptypes:
  - id: price
    name: price name
    description: A description description description description description description description description description description description description description description description longer than 200 characters
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0].description does not meet maximum length of 200
`);
    });

    test('It throws for invalid name', () => {
      mockFs({
        'grouptypes.yaml': `
name: name,
repository: bum-repo,
grouptypes:
  - id: price
    name: price name name name name name name name name name name name name name name name name name name name name name name name name name name name name longer then 50
    description: A description
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0].name does not meet maximum length of 50
`);
    });
  });

  describe('Alpha sorting', () => {
    test('It fails on out-of-order grouptypes IDs', () => {
      mockFs({
        'grouptypes.yaml': `
name: test
repository: bum-repo
grouptypes:
  - id: price
    name: price name
    description: Should be description
  - id: legal
    name: legal name
    description: Should be description
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0] is not sorted alphabetically
1: instance.grouptypes[1] is not sorted alphabetically
`);
    });

    test('It can fail on both sorting and schema', () => {
      mockFs({
        'grouptypes.yaml': `
#name: tst
repository: actions
grouptypes:
  - id: price
    name: price group
    description: the price group
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance requires property "name"
`);
    });
  });
});
