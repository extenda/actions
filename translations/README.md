# translations

This is a GitHub Action to create a Project and upload files for translation in Crowdin.

## Usage

See [action.yml](action.yml).

### Secrets
This action requires a GCP service account key with permissions to access secrets in pipeline-secrets project.

### Examples

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Crowdin Translations
        uses: extenda/actions/translations@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }} # Used to fetch required credentials from secrets (required)
          translations-definition: translations.yaml # default will match translations.yaml from the repository base directory.
```

## Translations YAML

The translations configuration should be specified in a YAML file that is later used by this action. This allows us to create projects and upload files for translation to Crowdin Platform.

By default, the action will load `translations.yaml` from the repository base directory.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/spec-schema.js). The following table explains what
properties are required and not.


| Property                                      | Description                                                                                                          | Required |
|:----------------------------------------------|:---------------------------------------------------------------------------------------------------------------------|:---------|
| `name`                                        | The name of the Crowdin project to be created                                                                                       | Yes       |
| `description`                           | The description of the project. Default `''`                      | No      |
| `source-language`                                    | Source Language Identifier for the source language. Default `'en'`                                                                            | Yes      |
| `target-languages`                               | The list of target Languages Identifiers for the languages to translate to                                                                         | Yes      |
| `repositories`                         | The lits of objects containing configurations for each service's repository                                                                                      | Yes      |
| `repositories.repo`                  | A repository name where service's code resides                                                          | yes       |
| `repositories.service-name`             | The name of your service from `repositories.repo` repository                                                                         | Yes      |
| `repositories.paths` | A list of service paths that contains file that need to be translated. To translate the whole directory please use the following syntax: `dir-name/another-dir/*`                    | Yes      |

### YAML Examples

#### Translations

```yaml
name: film-common-project
description: This is a project for film clan services
source-language: en
template-id: 1
glossary-access: true
target-languages:
  - da
  - fr
  - uk
translate-duplicates: 4
repositories:
  - repo: braveheart-quotes-webclient
    service-name: quotes-webclient
    paths:
      - src/en/*
  - repo: braveheart-quotes-service
    service-name: quotes-service
    paths:
      - src/en/translation/*
      - src/main/resources/*
```
