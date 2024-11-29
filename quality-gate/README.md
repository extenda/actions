# quality-gate

This is a GitHub Action to enforce a quality gate on your software project. This a composite-action that strives to
provide a vendor-agnostic quality gate feature. Behind the scenes the quality-gate is calculated by an external
code-scanning vendor.

The goal of this action is to hide implementation details of the active quality-gate provider. It is not a goal to
support multiple vendors at the same time. When this action is implemented in a pipeline, Extenda Retail should be able
to change the underlying quality-gate implementation without impacting pipelines.

## Usage

See [action.yml](action.yml).

The quality-gate action behavior can be controlled with the follow commit messages

  * `[init quality]` - Use on first run to initialize a quality baseline
  * `[rebase quality]` - Rebase the quality baseline, e.g. if baseline issues has been fixed
  * `[force quality]` - Force a full quality check instead of just checking changed files
  * `[skip quality]` - Skip the quality gate check

### Secrets

This action can be used either with GCP Secret Manager or with GitHub Action secrets.

If this action is used with GCP Secret Manager it requires a GCP service account key with permission to access
secret payloads. Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

To use the action with GitHub Actions secrets, set the `QUALITY_GATE_TOKEN` environment variable with the the secret
value.

### Examples

This example showcases how a `push` based test workflow can include a quality-gate to measure both code quality and
coverage.

```yaml
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v4
        with:
          java-version-file: .java-version
          distribution: temurin
          cache: maven

      - uses: extenda/actions/maven@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: verify

      - name: Quality Gate
        uses: extenda/actions/quality-gate@v0
        with:
          secrets-account-key: ${{ secrets.SECRET_AUTH }}
          collection: platform
```

If GCP Secret Manager isn't in use, pass the `QUALITY_GATE_TOKEN` as an environment variable instead of using
`secrets-account-key`.

```yaml
- name: Quality Gate
  uses: extenda/actions/quality-gate@v0
  with:
    collection: platform
  env:
    QUALITY_GATE_TOKEN: ${{ secrets.QUALITY_GATE_TOKEN }}
```
