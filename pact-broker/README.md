# pact-broker

This is a composite GitHub Action to make it easy to run an authenticated Pact Broker CLI.
The action will get credentials using the [gcp-secret-manager](../gcp-secret-manager#readme).

This is a low-level action and most end users should instead look ot the higher-order
actions built on top of this:

  * [pact-can-i-deploy](../pact-can-i-deploy#readme)
  * [pact-create-webhook](../pact-create-webhook#readme)
  * [pact-publish](../pact-publish#readme)
  * [pact-tag-version](../pact-tag-version#readme)

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how to use the action to execute commands with the Pact Broker CLI.
Note that it is important to use the correct multi-line string syntax.

```yaml
on: push

jobs:
  pact-broker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Publish pacts
        uses: extenda/actions/pact-broker@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: |-
            broker publish target/pacts \
            --tag="$(git rev-parse --abbrev-ref HEAD)" \
            --consumer-app-version=${{ github.sha }}
```

To set up a flow between two projects you need to use these steps:

#### Consumer

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Publish pacts
        uses: extenda/actions/pact-publish@v0
        with:
          pacts-directory: path-to-pacts
          service-account-key: ${{ secrets.SECRET_AUTH }}

  can-i-deploy:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Can i deploy?
        uses: extenda/actions/pact-can-i-deploy@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          env: prod
          retry-while-unknown: 60
          retry-interval: 10
```

#### Provider

The step configuration to create a webhook. This is placed just before the actual step to
trigger verification (e.g. the IT test to verify Pacts).

```yaml
jobs:
  test:
    steps:
      - name: Create Pact Broker provider webhook
        uses: extenda/actions/pact-create-webhook@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          repository-dispatch-id: verify-pacts
          uuid: a-uuid-that-you-generate
```

This exemplifies the webhook action. Note the 'types' that maps to the name that we used above.
```yaml
name: Verify pacts
on:
  repository_dispatch:
    types: verify-pacts

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            PACT_BROKER_USERNAME: pact-broker-username
            PACT_BROKER_PASSWORD: pact-broker-password

      - uses: actions/setup-java@v2
        with:
          distribution: 'temurin'
          java-version: 17
          cache: 'maven'

      - name: Verify pacts
        uses: extenda/actions/maven@v0
        timeout-minutes: 15
        with:
          args: verify -P pact-tests -T1C
          service-account-key: ${{ secrets.SECRET_AUTH }}
```

An example of the Maven POM profile. All Pact verification tests are suffixed with "PactIT".

```xml
<profile>
  <!-- Maven Profile to only run the pact tests -->
  <id>pact-tests</id>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-surefire-plugin</artifactId>
        <configuration>
          <skipTests>true</skipTests>
        </configuration>
      </plugin>
      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <configuration>
          <includes>
            <include>**/*PactIT.java</include>
          </includes>
          <excludes>
            <exclude>none</exclude>
          </excludes>
          <systemProperties>
            <pactbroker.auth.username>${env.PACT_BROKER_USERNAME}</pactbroker.auth.username>
            <pactbroker.auth.password>${env.PACT_BROKER_PASSWORD}</pactbroker.auth.password>
            <pact.provider.version>${env.GITHUB_SHA}</pact.provider.version>
            <pactbroker.providerTags>${env.GITHUB_BRANCH}</pactbroker.providerTags>
            <pact.verifier.publishResults>true</pact.verifier.publishResults>
          </systemProperties>
        </configuration>
      </plugin>
    </plugins>
  </build>
</profile>
```
