# setup-qodana

Setup Qodana for use with the Quality Gate Action. This action will discover qodana arguments and output them for use in
the [quality-gate](../quality-gate#readme). This action is not meant to be used directly, but rather as a part of the
quality-gate composite.

This action supports the following

  * Project types
    * TypeScript and JavaScript
    * JVM Languages (Java, Kotlin)
    * .NET Core (C#)
  * Qodana Cloud project
    * Create project and project-token
  * Detect coverage directory
    * lcov
    * Jacoco XML
  * Detect `baseline.sarif.json`
  * Sanity-check `qodana.yaml`
    * Generate `qodana.yaml` file if missing
    * Validate and enforce quality gate metrics
      * Fresh code
      * Issue count
