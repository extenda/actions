# iam

This is a GitHub Action to publish permissions and roles to Hii Retail IAM.

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

      - name: IAM permissions
        uses: extenda/actions/iam@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }} # Used to fetch required credentials from secrets (required)
          service-account-key-staging: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          service-account-key-prod: ${{ secrets.GCLOUD_AUTH_PROD }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          iam-definition: iam/*.yaml # default will match iam/*.yaml
          styra-url: https://extendaretail.svc.styra.com # default https://extendaretail.svc.styra.com 
```

## IAM YAML

The iam definition should be specified in a YAML file that is later used by this action. This allows us to handle
permissions and roles for this service.

By default, the action will load all YAML files matching the `iam/*.yaml` glob pattern. Each found file represents a
will be processed independent of others.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/iam-schema.js). The following table explains what
properties are required and not.

| Property                                      | Description                                                                                                 | Required |
|:----------------------------------------------|:------------------------------------------------------------------------------------------------------------|:---------|
| `name`                                        | The name of the service system                                                                              | No       |
| `permission-prefix`                           | The permission prefix, this will be prefixed to every permission and roles id. ([a-z][-a-z]{2})             | Yes      |
| `services`                                    | A list of services that need a DAS system                                                                   | Yes      |
| `services.name`                               | The service name of the system to be created                                                                | Yes      |
| `services.repository`                         | The description of the service                                                                              | Yes      |
| `services.allowed-consumers`                  | A list of clans and services allowed to consume this service                                                | No       |
| `services.allowed-consumers.clan`             | Your clan name subscribing to this service                                                                  | Yes      |
| `services.allowed-consumers.service-accounts` | A list of service accounts allowed to consume this service. (Full service account name required)            | Yes      |
| `permissions`                                 | An object containing the permissions for this service. (keys [a-z][-a-z]{1,15})                             | Yes      |
| `permissions.<resource>`                      | Array containing the verbs for the `<resource>`. (items: ids [a-z][-a-z]{1,15} or objects documented below) | Yes      |
| `permissions.<resource>.id`                   | Permission id [a-z][-a-z]{1,15}                                                                             | Yes      |
| `permissions.<resource>.alias`                | Permission alias (max 256 characters)                                                                       | Yes      |
| `roles`                                       | An list of roles that should exist for this service                                                         | No       |
| `roles.id`                                    | The role id ([a-z][-a-z]{1,19})                                                                             | Yes      |
| `roles.name`                                  | The role name                                                                                               | Yes      |
| `roles.desc`                                  | The description of the role, (max 200 characters)                                                           | Yes      |
| `roles.permissions`                           | An list of permissions this role should contain (items ^[a-z][-a-z]{1,15}\.[a-z][-a-z]{1,15}$)              | Yes      |

### YAML Examples

#### Create permissions and roles

This example defines a YAML file that creates roles and permissions for the DAS system `bhq`
```yaml
name: Braveheart Quotes
permission-prefix: bhq
services:
  - name: braveheart-quotes
    repository: braveheart-quotes-service
  - name: braveheart-quotes-webclient-be
    repository: braveheart-quotes-webclient-backend
permissions:
  favorite:
    - id: delete
      alias: delete-alias
    - toggle
    - list
  quote:
    - create
    - delete
    - get
    - list
    - update
roles:
  - id: admin
    name: Braveheart Quotes Admin
    desc: Create, modify and delete movie quotes.
    permissions:
      - quote.create
      - quote.delete
      - quote.get
      - quote.list
      - quote.update
  - id: user
    name: Braveheart Quotes User
    desc: Read and like movie quotes.
    permissions:
      - favorite.toggle
      - favorite.list
      - quote.get
      - quote.list


```

#### Create consumers for services

This example defines a YAML file that creates roles and permissions for the DAS system `bhq`
```yaml
name: quotes service
permission-prefix: bhq
services:
  - name: braveheart-quotes
    repository: braveheart-quotes-service
    allowed-consumers:
    - clan: iam
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
    - clan: quotes
      service-accounts:
        - braveheart-quotes-webclient-be@quotes-staging-ccdf.iam.gserviceaccount.com
  - name: braveheart-quotes-webclient-be
    repository: braveheart-quotes-webclient-backend
    allowed-consumers:
    - clan: iam
      service-accounts:
        - iam-api@iam-staging-c2a9.iam.gserviceaccount.com
        - iam-das-sync-worker@iam-staging-c2a9.iam.gserviceaccount.com
        - iam-oauth-client-managment@iam-staging-c2a9.iam.gserviceaccount.com
permissions:
  quote:
    - create
    - delete
    - get
    - list
    - update
roles:
  - id: admin
    name: Braveheart quotes administrator
    desc: full access
    permissions:
      - quote.create
      - quote.delete
      - quote.get
      - quote.list
      - quote.update
  - id: viewer
    name: Braveheart quotes viwer
    desc: view access
    permissions:
      - quote.get
      - quote.list

```

The consumers will be available in your das system by importing data.consumers. This dataset will contain an array named services with service-accounts.

example policy

```
allow = true {
  http_request.method == "GET"
  parsed_path == ["quotes"]
  googletoken.check("quotes.list")
}
```
