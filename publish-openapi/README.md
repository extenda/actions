# Deploy api documentation

This is a GitHub Action to deploy api documentation that will be made available on the url:
https://api-docs.hiiretail.com

This action will build your api documentation htlm content from your openapi.yaml file and upload onto a bucket where it will be hosted.
It is of importance that the input variables are correctly set as this will be used in the generation of the index pages.

## Example

This example will upload your documentation for version v1.0.0 of the iam-api service

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: publish api documentation
        uses: extenda/actions/publish-openapi@v0
        with:
          openapi: resources/openapi.yaml
          api-name: iam-api
          system-name: iam
          release-tag: v1.0.0
```
