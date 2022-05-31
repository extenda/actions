# pact-broker

This is a composite GitHub Action to make it easy to run an authenticated Pact Broker CLI.
The action will get credentials using the [gcp-secret-manager](../gcp-secret-manager#readme).

This is a low-level action and most end users should instead look ot the higher-order
actions built on top of this:

  * [pact-can-i-deploy](../pact-can-i-deploy#readme)
  * [pact-create-version](../pact-create-version#readme)
  * [pact-create-webhook](../pact-create-webhook#readme)
  * [pact-publish](../pact-publish#readme)
  * [pact-record-deployment](../pact-record-deployment#readme)
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
            --branch="$(git rev-parse --abbrev-ref HEAD)" \
            --consumer-app-version=${{ github.sha }}
```

To set up a flow between two projects, these steps can be an inspiration:

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

      - name: Can I deploy?
        uses: extenda/actions/pact-can-i-deploy@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          retry-while-unknown: 60
          retry-interval: 10

  release:
    steps:
      - name: Create pact release
        uses: extenda/actions/pact-tag-version@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          release-tag: ${{ steps.release.outputs.release-tag }}

  production:
    steps:
      - name: Deploy pact to Production
        uses: extenda/actions/pact-record-deployment@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          release-version: ${{ steps.release.outputs.version }}
```

#### Provider

The step to create the webhook should run before any verifications.

##### commit.yaml
```yaml
jobs:
  test:
    steps:
      - name: Create Pact Broker provider webhook
        uses: extenda/actions/pact-create-webhook@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          repository-dispatch-id: verify-pacts
          application-name: my-application
          uuid: a-uuid-that-you-generate

      - name: Verify pacts
        uses: extenda/actions/maven@v0
        timeout-minutes: 15
        with:
          ## Maven profile; optionally filter out just the PactIT tests (not the same profile as below!)
          ## or run all IT tests together.
          args: verify -T1C -P pact-tests
          service-account-key: ${{ secrets.SECRET_AUTH }}

      - name: Create/update pact version
        uses: extenda/actions/pact-create-version@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application

      - name: Can I deploy?
        uses: extenda/actions/pact-can-i-deploy@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          retry-while-unknown: 60
          retry-interval: 10

  release:
    steps:
      - name: Deploy pact to Production
        uses: extenda/actions/pact-record-deployment@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          release-version: ${{ steps.release.outputs.version }}
```

This exemplifies the webhook action. Note the `types` value below that maps to the `repository-dispatch-id` value above (can be omitted, default is `verify-pacts`) above.

##### verify-pacts.yaml
```yaml
name: Verify pacts
on:
  repository_dispatch:
    types: verify-pacts

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      PACT_CONSUMER: ${{ github.event.client_payload.pact-consumer }}
      PACT_CONSUMER_BRANCH: ${{ github.event.client_payload.pact-consumer-branch }}
      PACT_CONSUMER_VERSION: ${{ github.event.client_payload.pact-consumer-version }}
      PACT_PROVIDER: ${{ github.event.client_payload.pact-provider }}
      PACT_PROVIDER_BRANCH: ${{ github.event.client_payload.pact-provider-branch }}
      PACT_PROVIDER_VERSION: ${{ github.event.client_payload.pact-provider-version }}
      PACT_URL: ${{ github.event.client_payload.pact-url }}
      PACT_VERIFICATION_RESULT_URL: ${{ github.event.client_payload.pact-verification-result-url }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      # Optionally enable to inspect webhook contents
      #- name: Dump webhook contents
      #  run: echo "${{ toJSON(github.event.client_payload) }}"

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
          args: verify -P pact-webhook -T1C
          service-account-key: ${{ secrets.SECRET_AUTH }}
```

An example of the Maven POM profile. All Pact verification tests are suffixed with "PactIT".

```xml
<profile>
  <!-- Maven Profile triggered from the Github webhook (verify-pacts.yaml) -->
  <id>pact-webhook</id>
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
            <pactbroker.url>${env.PACT_URL}</pactbroker.url>
            <pact.verifier.publishResults>true</pact.verifier.publishResults>
          </systemProperties>
        </configuration>
      </plugin>
    </plugins>
  </build>
</profile>
```
