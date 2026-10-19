<!-- synced-with: discovered.md@1 -->
# actions

**Clan:** platform | **Tribe:** engineering | **Dept:** product-development
**Common repo:** extenda/engineering-platform-common

## Description

A monorepo of reusable GitHub Actions maintained by Extenda Retail's platform clan. They cover the core building blocks of the company's CI/CD pipelines: deploying to GCP, versioning and releases, IAM, Pact contract testing, quality and security scanning, and notifications.

## Type

Library: a collection of JavaScript (Node) GitHub Actions, one per top-level directory, each published as `extenda/actions/<action>@v0`.

## Stack

- Node.js 24 (`.nvmrc`), ES modules, npm workspaces (one workspace per action plus a shared `utils`)
- GitHub Actions toolkit: `@actions/core`, `@actions/exec`, `@actions/github`, `@actions/io`, `@actions/cache`, `@actions/tool-cache`
- HTTP: `axios` + `axios-retry`
- Config/parsing: `js-yaml`, `yaml`, `semver`, `fast-glob`
- Build: `esbuild` bundling each action (`.scripts/build-all-workspaces.js`)
- Testing: `vitest` (with v8 coverage and a Sonar reporter), `nock`, `memfs`/`mock-fs`
- Quality: ESLint + Prettier, SonarCloud, commitlint, pre-commit

## Purpose

Gives Extenda product teams shared, versioned CI/CD logic so service repos don't each reimplement deploy, release and compliance steps. Notable actions include `cloud-deploy` / `cloud-deploy-plan` (GCP Cloud Run/Cloud Deploy), `conventional-version` / `conventional-release`, `iam`, `agent-registry`, `external-events`, the `pact-*` family, `sonar-scanner`, `trivy-scan`, `jira-release*`, `slack-notify` and `dora-metrics`. Engineering teams across Extenda use these actions in their GitHub workflows. Several actions are deprecated (struck through in the README).
