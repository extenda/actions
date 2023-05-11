const jsYaml = require('js-yaml');

const valid = `
version: 1
system-prefix: che
definitions:
  - name: receipt-layout
    version: v1
    display-name: Receipt Layout config
    schema-location: https://example.com/receipt-layout-schema.json
    max-caching-level: tenants/self
    default-value:
      layout: default
`;

const validParsed = jsYaml.load(valid);

const valid2 = `
version: 1
system-prefix: tst
definitions:
  - name: receipt-layout
    version: v1
    schema-location: https://example.com/receipt-layout-schema.json
    max-caching-level: tenants/self
    display-name: Receipt Layout config
    default-value: abc
`;

const valid2Parsed = jsYaml.load(valid2);

const invalid = `
version: 1
system-prefix: tst-invalid
definitions:
  - name: true
    version: v11.23
    display-name: 1337
`;

const invalidParsed = jsYaml.load(invalid);

module.exports = {
  valid,
  valid2,
  validParsed,
  valid2Parsed,
  invalid,
  invalidParsed,
};
