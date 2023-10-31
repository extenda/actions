# liquibase-spanner

GitHub Action to run Liquibase on Spanner DB in your pipeline.

### Usage

Basic Update

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'update'
      classpath: 'example/changelogs'
      changeLogFile: 'samplechangelog.h2.sql'
      serviceAccountKey: ${{ secrets.GCLOUD_AUTH_STAGING }}
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
```

Optional Parameter Example:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'updateCount'
      classpath: 'example/changelogs'
      changeLogFile: 'samplechangelog.h2.sql'
      serviceAccountKey: ${{ secrets.GCLOUD_AUTH_STAGING }}
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
      count: 2
```

### Required Inputs

`operation`, `serviceAccountKey`, and `url` are required for every use.

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
