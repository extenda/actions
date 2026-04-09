# liquibase-spanner

GitHub Action to run Liquibase on Spanner DB in your pipeline.

### Usage

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v6
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'update'
      classpath: 'example/changelogs'
      changeLogFile: 'changelog-master.yaml'
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
```

### Required Inputs

`operation` and `url` are required for every use.

The action requires `GOOGLE_APPLICATION_CREDENTIALS` to be set in the environment, so this composite action has the `setup-gcloud` already configured.

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

`classpath`, `changeLogFile`, `count`, `tag`, `date`, `referenceUrl`, and `spannerExtensionUrl` are optional inputs that may be required by
some operations.

| Input                 | Description                                                                                                                                            |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `classpath`           | Path to the directory containing your Change Log files, relative to the root of your repository. This path is added to the Liquibase search path.      |
| `changeLogFile`       | The name of the Change Log file to execute (e.g., `changelog-master.yaml`). This file should be located within the directory specified by `classpath`. |
| `count`               | An integer representing the number of changesets to process. Required by `updateCount` and `rollbackCount`.                                            |
| `tag`                 | A string tag name used to identify a specific state of the database. Required by `tag`, `updateToTag`, and `rollback`.                                 |
| `date`                | A date or timestamp string identifying the point in time to roll back to. Required by `rollbackToDate`.                                                |
| `referenceUrl`        | The JDBC connection URL for the reference database to compare against. Required by `diff`.                                                             |
| `spannerExtensionUrl` | A direct download URL for a custom version of the `liquibase-spanner` extension. Defaults to `4.33.0.3`. See below for more information.               |

The following operations have the subsequent required inputs:a

#### spannerExtensionUrl

If you need to use a different version, you can provide the download URL of the `all` jar from the [liquibase-spanner releases](https://github.com/cloudspannerecosystem/liquibase-spanner/releases).

```yaml
  - uses: extenda/actions/liquibase-spanner@v0
    with:
      operation: 'update'
      url: jdbc:cloudspanner:/projects/<project>/instances/<instance>/databases/<database>
      spannerExtensionUrl: 'https://github.com/cloudspannerecosystem/liquibase-spanner/releases/download/4.33.0/liquibase-spanner-4.33.0-all.jar'
```

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
