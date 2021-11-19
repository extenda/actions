const jsYaml = require('js-yaml');

const valid = `
version: 1
system-prefix: iam
event-sources:
  - name: group-created
    version: v1
    display-name: IAM Group was created
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v1+iam.group-created
    content-type: application/json
    disabled: true
`;

const validParsed = jsYaml.load(valid);

const invalid = `
version: 1
system-prefix: iam-invalid
event-sources:
  - name: group-created
    version: v1.0.1
    display-name: IAM Group was created
    content-type: application/json
    disabled: yes
`;

const invalidParsed = jsYaml.load(invalid);

module.exports = {
  valid,
  validParsed,
  invalid,
  invalidParsed,
};
