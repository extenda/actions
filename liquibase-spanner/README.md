# liquibase-spanner

GitHub Action to run Liquibase on Spanner DB in your pipeline.

### Usage

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/setup-gcloud@v0
    with:
      service-account-key: ${{ secrets.GCLOUD_AUTH_WIF }}
      export-default-credentials: true
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'update'
      classpath: 'example/changelogs'
      changeLogFile: 'samplechangelog.h2.sql'
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
```

Optional Parameter Example:

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/setup-gcloud@v0
    with:
      service-account-key: ${{ secrets.GCLOUD_AUTH_WIF }}
      export-default-credentials: true
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'updateCount'
      classpath: 'example/changelogs'
      changeLogFile: 'samplechangelog.h2.sql'
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
      count: 2
```

### Required Inputs

`operation` and `url` are required for every use.
The action requires `GOOGLE_APPLICATION_CREDENTIALS` to be set in the environment (e.g. by running `setup-gcloud` with `export-default-credentials: true`).

The `operation` input expects one of the following:

- update
- updateCount
- tag
- updateToTag
- rollback
- rollbackCount
- rollbackToDate
- updateSQL
- futureRollbackSQL
- status
- history
- diff

### Optional Inputs

`classpath`, `changeLogFile`, `count`, `tag`, `date`, and `referenceUrl` are optional inputs that may be required by
some operations. The following operations have the subsequent required inputs:

#### updateCount

- classpath
- changeLogFile
- count

#### tag

- tag

#### updateToTag

- classpath
- changeLogFile
- tag

#### rollback

- classpath
- changeLogFile
- tag

#### rollbackCount

- classpath
- changeLogFile
- count

#### rollbackToDate

- classpath
- changeLogFile
- date

#### updateSQL

- changeLogFile

#### futureRollbackSQL

- classpath
- changeLogFile

#### status

- classpath
- changeLogFile

#### diff

- referenceUrl
