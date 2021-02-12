# iam

This is a GitHub Action to publish group types to Hii Retail Business Unit.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Group Types
        uses: extenda/actions/bum@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }} # Used to fetch required credentials from secrets (required)
          service-account-key-staging: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          service-account-key-prod: ${{ secrets.GCLOUD_AUTH_PROD }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          grouptype-definition: bum/*.yaml # default will match bum/*.yaml
```

## Group types YAML

The group type definition should be specified in a YAML file that is later used by this action. This allows us to add group types for this service.

By default, the action will load all YAML files matching the `bum/*.yaml` glob pattern. Each found file represents a
will be processed independent of others.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/iam-schema.js). The following table explains what
properties are required and not.

| Property                   | Description                                                                                      | Required |
|:---------------------------|:-------------------------------------------------------------------------------------------------|:---------|
| `name`                     | The name of the service system                                                                   | Yes      |
| `repository`               | The repository for the service                                                                   | Yes      |
| `grouptypes`               | An list of group types that should exist for this service                                              | No       |
| `grouptypes.id`            | The role id ([a-z][-a-z]{1,19})                                                                  | Yes      |
| `grouptypes.name`          | The role name                                                                                    | Yes      |
| `grouptypes.description`          | The description of the role, (max 200 characters)                                                | Yes      |

### YAML Examples

#### Create permissions and roles

This example defines a YAML file that creates roles and permissions for the DAS system `bhq`
```yaml
name: Braveheart Quotes
repository: braveheart-quotes-service
grouptypes:
  - id: legal
    name: Legal type
    description: Top node for legal three
  - id: region
    name: Region type
    description: Top node for region three


```
