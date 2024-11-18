# quality-gate

This is a GitHub Action to enforce a quality gate on your software project. This a composite-action that strives to
provide a vendor-agnostic quality gate feature. Behind the scenes the quality-gate is calculated by an external
code-scanning vendor.

The goal of this action is to hide implementation details of the active quality-gate provider. It is not a goal to
support multiple vendors at the same time. When this action is implemented in a pipeline, Extenda Retail should be able
to change the underlying quality-gate implementation without impacting pipelines.

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
          quality-gate-token: ${{ secrets.QUALITY_GATE_TOKEN }}
          code-owners: platform-services
```
