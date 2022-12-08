# External events GitHub Action

This GitHub action synchronises 'external events' config with `External events` service.
# Usage

See [action.yml](action.yml)

# Common repo setup

This action is used to sync `EXE` configuration from your repo with `EXE Service`.

Expected structure of our common repo:

At the root of repo you should create directory `external-events`.
Under that directory you can have multiple `*.yaml`
Each `system-prefix` in each file must be unique.

Example (external-events/iam.yaml)
```yaml
version: 1 # (required) always 1 for now
# id for event source is generated from template {system}.{name}.{version}
system-prefix: iam # (required) (part of generated id)
event-sources: # (required) list of event sources for your system
  - name: group-created # (required) name of the event source (part of generated id)
    version: v1 # (required) version of event source (part of generated id)
    display-name: IAM Group was created # (required) human readable name for event source
    # (required)
    # push subscription that will push events to external event dispatch API
    # (doc) https://github.com/extenda/engineering-cloud-core-common/tree/master/docs/exe/internal
    # if you're using the Ingest Dispatch API, you can use a stub value for subscription:
    # projects/cloud-core-prod-2d76/subscriptions/exe.public.output.events.v1+exe.event
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v1+iam.group-created
    # (required) content type of data from subscription above. usually application/json
    content-type: application/json
    # (optional, default - false)
    # event source will still work, but it will not be available for new webhooks
    disabled: true
    deprecated: # (optional) deprecation metadata, the ES may be deleted after the "removal-date"
      removal-date: "2020-02-02" # (required) YYYY-MM-DD, should be explicitly specified as a string with double quotes
      message: any string # (optional) will be displayed along with event messages
      replaced-with: iam.group-created.v2 # (optional) event source id that will replace the deprecated
  - name: group-created
    version: v2
    display-name: IAM Group was created
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v2+iam.group-created
    content-type: application/json
  - name: group-updated
    version: v1
    display-name: IAM Group was updated
    subscription-name: projects/iam-prod-4aad/subscriptions/iam.public.output.events.v1+iam.group-updated
    content-type: application/json
```

# Action setup example

.github/workflows/exe.yml
```yaml
name: External events
on:
  push:
    paths: external-events/*.yaml

jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: External events sync
        uses: extenda/actions/external-events@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          definitions: external-events/*.yaml # default is `external-events/*.yaml`
          dry-run: ${{ github.ref != 'refs/heads/master' }}
```
