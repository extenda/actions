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
    desc: Should be desc`,
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
    desc: Should be desc
    custom: My own property`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0] is not allowed to have the additional property "custom"
`);
    });

    test('It throws for too long desc', () => {
      mockFs({
        'grouptypes.yaml': `
name: test
repository: bum-repo
grouptypes:
  - id: price
    name: price name
    desc: A description description description description description description description description description description description description description description description longer than 200 characters
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance.grouptypes[0].desc does not meet maximum length of 200
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
    desc: A description
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
    desc: Should be desc
  - id: legal
    name: legal name
    desc: Should be desc
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
    desc: the price group
`,
      });
      expect(() => loadGroupTypeDefinition('grouptypes.yaml'))
        .toThrow(`grouptypes.yaml is not valid.
0: instance requires property "name"
`);
    });
  });
});
