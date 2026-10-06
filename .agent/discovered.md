<!-- version: 1 -->
# Discovered

## Service
**Repo:** actions
**Service name:** <!-- discovery-error: no cloud-deploy.yaml found -->
**Clan:** cloud-core | **Tribe:** engineering | **Dept:** product-development
**Common repo:** extenda/engineering-cloud-core-common
**IAM roles:** <!-- discovery-error: iam roles not detected -->
## Dependencies
### Upstream — services with IAM access to this service
- ccc
- css
- ecs
- exe
- sio
- trs
- tss
- txr

### Other services in this clan
b2b-customer-registry-api, bum-ui-new, cash-guard-config-ui, cash-mngmt-tender-config-ui, ccc-api, ccc-history-ui, ccc-socketio-connector, ccc-worker, checkout-app-config-ui, configuration-portal-poc-ui, configuration-portal-ui, configuration-portal-ui-new, core-library, css-api, currencies-config-ui, device-config-ui, ecs-api, ecs-bundle-proxy, ecs-bundle-worker, embedded-login-ui, exchange-rates-config-ui, exe-dispatch, exe-emit-api, exe-event-journal-saver, exe-ingestor-dispatch-api, exe-management-api, frontend-code-generator, hii-feature-proxy, hiiretail-console, in-store-configuration, in-store-configuration-ui, landing-page-bpr, landing-page-test-crfm, ltc-api, ltc-ui, ltc-ui-new, manage-store-ui, operational-status-ui, plu-ui, plu-ui-new, pos-config-ui, react-foundation-ui, react-native-foundation-ui, reason-codes-ui, receipt-layout-ui-new, recon-tender-config-ui, shared-ui, socketio-emitter-service, socketio-service, survey-ui, task-scheduler-api, tender-config-ui, translation-api, translation-demo-app, txr-archiver-worker, txr-bu-sync-function, txr-dataset-sync-worker, txr-digital-receipt-bin, txr-digital-receipt-ingestor, txr-external-sync, txr-gap-checker, txr-input-api, txr-jobs-runner, txr-search-api, txr-transaction-indexer, txr-transaction-publisher, txr-transaction-writer, ui-core, wordline-connector-config-ui, xzr-ui

### Fetch clan data on demand
| What | Command |
|---|---|
| Clan inventory (staging) | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/cloud-core/staging/project.yaml --jq '.content' \| base64 -d` |
| Clan inventory (prod)    | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/cloud-core/prod/project.yaml --jq '.content' \| base64 -d` |
| IAM permissions          | `gh api repos/extenda/engineering-cloud-core-common/contents/iam/<prefix>.yaml --jq '.content' \| base64 -d` |
| RCA history              | `gh api repos/extenda/engineering-cloud-core-common/contents/docs/rca/ --jq '.[].name'` |
| Clan members             | `gh api repos/extenda/tf-infra-gcp/contents/organization/extendaretail-com/departments/product-development/engineering/clans/cloud-core/clan.yaml --jq '.content' \| base64 -d` |
