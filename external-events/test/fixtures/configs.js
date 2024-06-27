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
    schemaUrl: https://raw.githubusercontent.com/extenda/hiiretail-json-schema-registry/master/external-events/cloud-core/event-source-schema.json
    deprecated:
      removal-date: "2022-02-01"
      message: message
      replaced-with: iam.group-created.v2
`;

const validParsed = jsYaml.load(valid);

const valid2 = `
version: 1
system-prefix: tst
event-sources:
  - name: event
    version: v10
    display-name: test event
    subscription-name: projects/project-id/subscriptions/tst.public.output.events.v1+tst.event
    schemaUrl: https://raw.githubusercontent.com/extenda/hiiretail-json-schema-registry/master/external-events/cloud-core/event-source-schema.json
    content-type: text/plain
`;

const valid2Parsed = jsYaml.load(valid2);

const invalid = `
version: 1
system-prefix: iam-invalid
event-sources:
  - name: group-created
    version: v1.0.1
    display-name: IAM Group was created
    content-type: application/json
    disabled: yes
    schemaUrl: invalid-url
    deprecated:
      removal-date: 2022/02/01
      replaced-with: invalid.group-created.v2
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
