<!-- version: 1 -->
# Discovered

## Service

- **Repo:** actions
- **Service name:** <!-- discovery-error: no cloud-deploy.yaml found -->
- **Clan:** platform | **Tribe:** engineering | **Dept:** product-development
- **Common repo:** extenda/engineering-platform-common
- **IAM roles:** <!-- discovery-error: iam roles not detected -->

## Dependencies

### Upstream — services with IAM access to this service

- cle
- csm
- dvp
- pla
- sec

### Other services in this clan

- apache-devlake
- apache-devlake-config-ui
- apache-devlake-grafana
- bq-dataset-function
- certbot-edge-job
- checkout-app-releases
- checkout-service-manager-api
- cloud-storage-function
- hiiretail-changelog-external
- hiiretail-developer-docs
- hiiretail-maintenance-server
- hiiretail-platform-agent
- hiiretail-platform-api
- hiiretail-platform-worker
- keycloak
- launchdarkly-api-gateway
- launchdarkly-ui
- open-pr-function
- otel-collector-example
- pact-broker
- pubsub-function
- security-authz
- trigger-workflow-function

### Fetch clan data on demand

| What | Command |
|---|---|
| Clan inventory (staging) | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/platform/staging/project.yaml --jq '.content' \| base64 -d` |
| Clan inventory (prod)    | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/platform/prod/project.yaml --jq '.content' \| base64 -d` |
| IAM permissions          | `gh api repos/extenda/engineering-platform-common/contents/iam/<prefix>.yaml --jq '.content' \| base64 -d` |
| RCA history              | `gh api repos/extenda/engineering-platform-common/contents/docs/rca/ --jq '.[].name'` |
| Clan members             | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/platform/clan.yaml --jq '.content' \| base64 -d` |
| Jira project key         | `gh api repos/extenda/engineering-platform-common/contents/infra/common.hcl --jq '.content' \| base64 -d \| sed -n 's/.*jira_project_key *= *"\(.*\)".*/\1/p'` |
