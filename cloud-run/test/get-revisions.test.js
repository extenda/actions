jest.mock('@actions/exec');
const { exec } = require('@actions/exec');
const getRevisions = require('../src/get-revisions');
const { mockOutput } = require('./utils');

const GCLOUD_JSON_OUTPUT = `[
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/minScale": "1",
        "client.knative.dev/user-image": "eu.gcr.io/extenda/isrg-checkout-engine:61e0d23feca23a4042b366eaedc11b4248ef5f91",
        "run.googleapis.com/client-name": "gcloud",
        "run.googleapis.com/client-version": "446.0.0",
        "serving.knative.dev/creator": "ci-cd-pipeline@txengine-prod-1c85.iam.gserviceaccount.com",
        "serving.knative.dev/routes": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/routingStateModified": "2023-09-13T07:46:16Z"
      },
      "creationTimestamp": "2023-09-12T21:32:59Z",
      "generation": 1,
      "labels": {
        "client.knative.dev/nonce": "ghfoazrjpj",
        "component": "checkout-engine",
        "environment": "prod",
        "iso-country": "es",
        "product": "hii-checkout",
        "service_env": "prod",
        "service_project": "txengine",
        "service_project_id": "txengine-prod-1c85",
        "serving.knative.dev/configuration": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/configurationGeneration": "34",
        "serving.knative.dev/configurationUID": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5",
        "serving.knative.dev/routingState": "active",
        "serving.knative.dev/service": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/serviceUID": "91293618-35d1-4168-8902-52a955faaae1",
        "sre.canary.enabled": "false",
        "tenant-alias": "isrg-test"
      },
      "managedFields": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:status": {
              ".": {},
              "f:actualReplicas": {},
              "f:conditions": {},
              "f:containerStatuses": {},
              "f:desiredReplicas": {},
              "f:logUrl": {},
              "f:observedGeneration": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "subresource": "status",
          "time": "2023-09-12T21:33:21Z"
        },
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:metadata": {
              "f:annotations": {
                ".": {},
                "f:autoscaling.knative.dev/minScale": {},
                "f:client.knative.dev/user-image": {},
                "f:run.googleapis.com/client-name": {},
                "f:run.googleapis.com/client-version": {},
                "f:serving.knative.dev/creator": {},
                "f:serving.knative.dev/routes": {},
                "f:serving.knative.dev/routingStateModified": {}
              },
              "f:labels": {
                ".": {},
                "f:client.knative.dev/nonce": {},
                "f:component": {},
                "f:environment": {},
                "f:iso-country": {},
                "f:product": {},
                "f:service_env": {},
                "f:service_project": {},
                "f:service_project_id": {},
                "f:serving.knative.dev/configuration": {},
                "f:serving.knative.dev/configurationGeneration": {},
                "f:serving.knative.dev/configurationUID": {},
                "f:serving.knative.dev/routingState": {},
                "f:serving.knative.dev/service": {},
                "f:serving.knative.dev/serviceUID": {},
                "f:sre.canary.enabled": {},
                "f:tenant-alias": {}
              },
              "f:ownerReferences": {
                ".": {},
                "k:{\\"uid\\":\\"719ce6e7-1202-4b68-9bae-33a5f6c99aa5\\"}": {}
              }
            },
            "f:spec": {
              ".": {},
              "f:containerConcurrency": {},
              "f:containers": {},
              "f:enableServiceLinks": {},
              "f:timeoutSeconds": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "time": "2023-09-13T07:46:16Z"
        }
      ],
      "name": "isrg-es-sandbox-checkout-api-00034",
      "namespace": "isrg-es-sandbox-checkout-api",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "isrg-es-sandbox-checkout-api",
          "uid": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5"
        }
      ],
      "resourceVersion": "1339594980",
      "uid": "bf08d7b3-d1c7-4e67-92b0-e485f27f908f"
    },
    "spec": {
      "containerConcurrency": 30,
      "containers": [
        {
          "env": [
            {
              "name": "POS_NODE",
              "value": "nodes/checkout-api"
            },
            {
              "name": "HIIRETAIL_MQTT_HOST",
              "value": "vernemq.tx-vernemq-broker.svc.cluster.local"
            },
            {
              "name": "CARD_PAYMENT_HOST",
              "value": "payment-router.retailsvc.com"
            },
            {
              "name": "TE_EVENT_LINK_SCHEME",
              "value": "https"
            },
            {
              "name": "DATABASE_USER",
              "value": "postgres"
            },
            {
              "name": "DATABASE_HOST",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_private_address"
            },
            {
              "name": "DATABASE_PASSWORD",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_master_password"
            },
            {
              "name": "LAUNCH_DARKLY_ACCESS_KEY",
              "value": "sm://txengine-prod-1c85/launchdarkly-sdk-key"
            },
            {
              "name": "REDIS_CONNECTION_HOST",
              "value": "sm://txengine-prod-1c85/memorystore_checkout-engine_host"
            },
            {
              "name": "SINGLE_ASSORTMENT_BUSINESS_UNIT_ID",
              "value": "96D"
            },
            {
              "name": "TENANT_ID",
              "value": "W5RJB9yo0feBai6KyF6Etest"
            },
            {
              "name": "COUNTRY_MODULE",
              "value": "ES"
            },
            {
              "name": "TZ",
              "value": "Europe/Madrid"
            },
            {
              "name": "POS_PROPS_FILE",
              "value": "txengine_sandbox.properties"
            },
            {
              "name": "BUSINESS_UNIT_GROUP_ID",
              "value": "ESSprinter"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "txengine-prod-1c85"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "prod"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/isrg-checkout-engine:f06ece18d7957c2c952e23787cf1e48e7391f669"
            }
          ],
          "image": "eu.gcr.io/extenda/isrg-checkout-engine:f06ece18d7957c2c952e23787cf1e48e7391f669",
          "name": "user-container",
          "readinessProbe": {
            "successThreshold": 1,
            "tcpSocket": {
              "port": 0
            }
          },
          "resources": {
            "limits": {
              "cpu": "2",
              "memory": "2Gi"
            }
          }
        }
      ],
      "enableServiceLinks": false,
      "timeoutSeconds": 300
    },
    "status": {
      "actualReplicas": 1,
      "conditions": [
        {
          "lastTransitionTime": "2023-09-13T07:46:36Z",
          "severity": "Info",
          "status": "True",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-09-12T21:33:20Z",
          "status": "True",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-09-12T21:33:20Z",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-09-12T21:32:59Z",
          "status": "True",
          "type": "ResourcesAvailable"
        }
      ],
      "containerStatuses": [
        {
          "imageDigest": "eu.gcr.io/extenda/isrg-checkout-engine@sha256:9da01c94da60e2388c4697877db5377bc2616b5d42c95bac0b17ccb8047f6cb6",
          "name": "user-container"
        }
      ],
      "desiredReplicas": 1,
      "logUrl": "https://console.cloud.google.com/logs/viewer?advancedFilter=resource.type%3D%22k8s_container%22%0Aresource.labels.container_name%3D%22user-container%22%0Alabels.%22k8s-pod%2Fserving_knative_dev%2FrevisionUID%22%3D%22bf08d7b3-d1c7-4e67-92b0-e485f27f908f%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/minScale": "1",
        "client.knative.dev/user-image": "eu.gcr.io/extenda/isrg-checkout-engine:61e0d23feca23a4042b366eaedc11b4248ef5f91",
        "run.googleapis.com/client-name": "gcloud",
        "run.googleapis.com/client-version": "442.0.0",
        "serving.knative.dev/creator": "ci-cd-pipeline@txengine-prod-1c85.iam.gserviceaccount.com",
        "serving.knative.dev/routingStateModified": "2023-08-14T19:22:06Z"
      },
      "creationTimestamp": "2023-08-14T06:06:10Z",
      "generation": 1,
      "labels": {
        "component": "checkout-engine",
        "environment": "prod",
        "iso-country": "es",
        "product": "hii-checkout",
        "service_env": "prod",
        "service_project": "txengine",
        "service_project_id": "txengine-prod-1c85",
        "serving.knative.dev/configuration": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/configurationGeneration": "30",
        "serving.knative.dev/configurationUID": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5",
        "serving.knative.dev/routingState": "reserve",
        "serving.knative.dev/service": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/serviceUID": "91293618-35d1-4168-8902-52a955faaae1",
        "sre.canary.enabled": "false",
        "tenant-alias": "isrg-test"
      },
      "managedFields": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:status": {
              ".": {},
              "f:actualReplicas": {},
              "f:conditions": {},
              "f:containerStatuses": {},
              "f:logUrl": {},
              "f:observedGeneration": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "subresource": "status",
          "time": "2023-08-14T06:07:34Z"
        },
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:metadata": {
              "f:annotations": {
                ".": {},
                "f:autoscaling.knative.dev/minScale": {},
                "f:client.knative.dev/user-image": {},
                "f:run.googleapis.com/client-name": {},
                "f:run.googleapis.com/client-version": {},
                "f:serving.knative.dev/creator": {},
                "f:serving.knative.dev/routingStateModified": {}
              },
              "f:labels": {
                ".": {},
                "f:component": {},
                "f:environment": {},
                "f:iso-country": {},
                "f:product": {},
                "f:service_env": {},
                "f:service_project": {},
                "f:service_project_id": {},
                "f:serving.knative.dev/configuration": {},
                "f:serving.knative.dev/configurationGeneration": {},
                "f:serving.knative.dev/configurationUID": {},
                "f:serving.knative.dev/routingState": {},
                "f:serving.knative.dev/service": {},
                "f:serving.knative.dev/serviceUID": {},
                "f:sre.canary.enabled": {},
                "f:tenant-alias": {}
              },
              "f:ownerReferences": {
                ".": {},
                "k:{\\"uid\\":\\"719ce6e7-1202-4b68-9bae-33a5f6c99aa5\\"}": {}
              }
            },
            "f:spec": {
              ".": {},
              "f:containerConcurrency": {},
              "f:containers": {},
              "f:enableServiceLinks": {},
              "f:timeoutSeconds": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "time": "2023-08-14T19:22:06Z"
        }
      ],
      "name": "isrg-es-sandbox-checkout-api-00058-tez",
      "namespace": "isrg-es-sandbox-checkout-api",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "isrg-es-sandbox-checkout-api",
          "uid": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5"
        }
      ],
      "resourceVersion": "1304385607",
      "uid": "7f0ec71a-ea65-4912-984c-f7dcc09fdf17"
    },
    "spec": {
      "containerConcurrency": 30,
      "containers": [
        {
          "env": [
            {
              "name": "POS_NODE",
              "value": "nodes/checkout-api"
            },
            {
              "name": "HIIRETAIL_MQTT_HOST",
              "value": "vernemq.tx-vernemq-broker.svc.cluster.local"
            },
            {
              "name": "CARD_PAYMENT_HOST",
              "value": "payment-router.retailsvc.com"
            },
            {
              "name": "TE_EVENT_LINK_SCHEME",
              "value": "https"
            },
            {
              "name": "DATABASE_USER",
              "value": "postgres"
            },
            {
              "name": "DATABASE_HOST",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_private_address"
            },
            {
              "name": "DATABASE_PASSWORD",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_master_password"
            },
            {
              "name": "LAUNCH_DARKLY_ACCESS_KEY",
              "value": "sm://txengine-prod-1c85/launchdarkly-sdk-key"
            },
            {
              "name": "REDIS_CONNECTION_HOST",
              "value": "sm://txengine-prod-1c85/memorystore_checkout-engine_host"
            },
            {
              "name": "SINGLE_ASSORTMENT_BUSINESS_UNIT_ID",
              "value": "96D"
            },
            {
              "name": "TENANT_ID",
              "value": "W5RJB9yo0feBai6KyF6Etest"
            },
            {
              "name": "COUNTRY_MODULE",
              "value": "ES"
            },
            {
              "name": "TZ",
              "value": "Europe/Madrid"
            },
            {
              "name": "POS_PROPS_FILE",
              "value": "txengine_sandbox.properties"
            },
            {
              "name": "BUSINESS_UNIT_GROUP_ID",
              "value": "ESSprinter"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "txengine-prod-1c85"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "prod"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/isrg-checkout-engine:443cf6f49c0f76e5e917d684c4f3e6a2462e2cab"
            }
          ],
          "image": "eu.gcr.io/extenda/isrg-checkout-engine:443cf6f49c0f76e5e917d684c4f3e6a2462e2cab",
          "name": "user-container",
          "readinessProbe": {
            "successThreshold": 1,
            "tcpSocket": {
              "port": 0
            }
          },
          "resources": {
            "limits": {
              "cpu": "2",
              "memory": "2Gi"
            }
          }
        }
      ],
      "enableServiceLinks": false,
      "timeoutSeconds": 300
    },
    "status": {
      "actualReplicas": 0,
      "conditions": [
        {
          "lastTransitionTime": "2023-08-14T19:22:07Z",
          "message": "The target is not receiving traffic.",
          "reason": "NoTraffic",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-08-14T06:07:31Z",
          "status": "True",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-08-14T06:07:31Z",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-08-14T06:07:31Z",
          "status": "True",
          "type": "ResourcesAvailable"
        }
      ],
      "containerStatuses": [
        {
          "imageDigest": "eu.gcr.io/extenda/isrg-checkout-engine@sha256:9be5efc764f79c6276dd46ee3c39e5fab315df4f498045a79955c668d8883507",
          "name": "user-container"
        }
      ],
      "logUrl": "https://console.cloud.google.com/logs/viewer?advancedFilter=resource.type%3D%22k8s_container%22%0Aresource.labels.container_name%3D%22user-container%22%0Alabels.%22k8s-pod%2Fserving_knative_dev%2FrevisionUID%22%3D%227f0ec71a-ea65-4912-984c-f7dcc09fdf17%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/minScale": "1",
        "client.knative.dev/user-image": "eu.gcr.io/extenda/isrg-checkout-engine:61e0d23feca23a4042b366eaedc11b4248ef5f91",
        "run.googleapis.com/client-name": "gcloud",
        "run.googleapis.com/client-version": "442.0.0",
        "serving.knative.dev/creator": "ci-cd-pipeline@txengine-prod-1c85.iam.gserviceaccount.com",
        "serving.knative.dev/routingStateModified": "2023-08-15T21:21:34Z"
      },
      "creationTimestamp": "2023-08-14T19:21:29Z",
      "generation": 1,
      "labels": {
        "component": "checkout-engine",
        "environment": "prod",
        "iso-country": "es",
        "product": "hii-checkout",
        "service_env": "prod",
        "service_project": "txengine",
        "service_project_id": "txengine-prod-1c85",
        "serving.knative.dev/configuration": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/configurationGeneration": "31",
        "serving.knative.dev/configurationUID": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5",
        "serving.knative.dev/routingState": "reserve",
        "serving.knative.dev/service": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/serviceUID": "91293618-35d1-4168-8902-52a955faaae1",
        "sre.canary.enabled": "false",
        "tenant-alias": "isrg-test"
      },
      "managedFields": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:status": {
              ".": {},
              "f:actualReplicas": {},
              "f:conditions": {},
              "f:containerStatuses": {},
              "f:logUrl": {},
              "f:observedGeneration": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "subresource": "status",
          "time": "2023-08-14T19:22:01Z"
        },
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:metadata": {
              "f:annotations": {
                ".": {},
                "f:autoscaling.knative.dev/minScale": {},
                "f:client.knative.dev/user-image": {},
                "f:run.googleapis.com/client-name": {},
                "f:run.googleapis.com/client-version": {},
                "f:serving.knative.dev/creator": {},
                "f:serving.knative.dev/routingStateModified": {}
              },
              "f:labels": {
                ".": {},
                "f:component": {},
                "f:environment": {},
                "f:iso-country": {},
                "f:product": {},
                "f:service_env": {},
                "f:service_project": {},
                "f:service_project_id": {},
                "f:serving.knative.dev/configuration": {},
                "f:serving.knative.dev/configurationGeneration": {},
                "f:serving.knative.dev/configurationUID": {},
                "f:serving.knative.dev/routingState": {},
                "f:serving.knative.dev/service": {},
                "f:serving.knative.dev/serviceUID": {},
                "f:sre.canary.enabled": {},
                "f:tenant-alias": {}
              },
              "f:ownerReferences": {
                ".": {},
                "k:{\\"uid\\":\\"719ce6e7-1202-4b68-9bae-33a5f6c99aa5\\"}": {}
              }
            },
            "f:spec": {
              ".": {},
              "f:containerConcurrency": {},
              "f:containers": {},
              "f:enableServiceLinks": {},
              "f:timeoutSeconds": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "time": "2023-08-15T21:21:34Z"
        }
      ],
      "name": "isrg-es-sandbox-checkout-api-00060-jut",
      "namespace": "isrg-es-sandbox-checkout-api",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "isrg-es-sandbox-checkout-api",
          "uid": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5"
        }
      ],
      "resourceVersion": "1304385498",
      "uid": "cc8b4571-b1a6-4694-9191-514ed84182e9"
    },
    "spec": {
      "containerConcurrency": 30,
      "containers": [
        {
          "env": [
            {
              "name": "POS_NODE",
              "value": "nodes/checkout-api"
            },
            {
              "name": "HIIRETAIL_MQTT_HOST",
              "value": "vernemq.tx-vernemq-broker.svc.cluster.local"
            },
            {
              "name": "CARD_PAYMENT_HOST",
              "value": "payment-router.retailsvc.com"
            },
            {
              "name": "TE_EVENT_LINK_SCHEME",
              "value": "https"
            },
            {
              "name": "DATABASE_USER",
              "value": "postgres"
            },
            {
              "name": "DATABASE_HOST",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_private_address"
            },
            {
              "name": "DATABASE_PASSWORD",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_master_password"
            },
            {
              "name": "LAUNCH_DARKLY_ACCESS_KEY",
              "value": "sm://txengine-prod-1c85/launchdarkly-sdk-key"
            },
            {
              "name": "REDIS_CONNECTION_HOST",
              "value": "sm://txengine-prod-1c85/memorystore_checkout-engine_host"
            },
            {
              "name": "SINGLE_ASSORTMENT_BUSINESS_UNIT_ID",
              "value": "96D"
            },
            {
              "name": "TENANT_ID",
              "value": "W5RJB9yo0feBai6KyF6Etest"
            },
            {
              "name": "COUNTRY_MODULE",
              "value": "ES"
            },
            {
              "name": "TZ",
              "value": "Europe/Madrid"
            },
            {
              "name": "POS_PROPS_FILE",
              "value": "txengine_sandbox.properties"
            },
            {
              "name": "BUSINESS_UNIT_GROUP_ID",
              "value": "ESSprinter"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "txengine-prod-1c85"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "prod"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/isrg-checkout-engine:659e28fd14052591f8f473439d65346cc7bc852d"
            }
          ],
          "image": "eu.gcr.io/extenda/isrg-checkout-engine:659e28fd14052591f8f473439d65346cc7bc852d",
          "name": "user-container",
          "readinessProbe": {
            "successThreshold": 1,
            "tcpSocket": {
              "port": 0
            }
          },
          "resources": {
            "limits": {
              "cpu": "2",
              "memory": "2Gi"
            }
          }
        }
      ],
      "enableServiceLinks": false,
      "timeoutSeconds": 300
    },
    "status": {
      "actualReplicas": 0,
      "conditions": [
        {
          "lastTransitionTime": "2023-08-15T21:21:34Z",
          "message": "The target is not receiving traffic.",
          "reason": "NoTraffic",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-08-14T19:21:59Z",
          "status": "True",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-08-14T19:21:59Z",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-08-14T19:21:29Z",
          "status": "True",
          "type": "ResourcesAvailable"
        }
      ],
      "containerStatuses": [
        {
          "imageDigest": "eu.gcr.io/extenda/isrg-checkout-engine@sha256:d27ade807b8fd0e60741ae6c30f3190d2317aac45291f2284b4a3f3a103d5547",
          "name": "user-container"
        }
      ],
      "logUrl": "https://console.cloud.google.com/logs/viewer?advancedFilter=resource.type%3D%22k8s_container%22%0Aresource.labels.container_name%3D%22user-container%22%0Alabels.%22k8s-pod%2Fserving_knative_dev%2FrevisionUID%22%3D%22cc8b4571-b1a6-4694-9191-514ed84182e9%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/minScale": "1",
        "client.knative.dev/user-image": "eu.gcr.io/extenda/isrg-checkout-engine:61e0d23feca23a4042b366eaedc11b4248ef5f91",
        "run.googleapis.com/client-name": "gcloud",
        "run.googleapis.com/client-version": "443.0.0",
        "serving.knative.dev/creator": "ci-cd-pipeline@txengine-prod-1c85.iam.gserviceaccount.com",
        "serving.knative.dev/routingStateModified": "2023-09-13T07:46:16Z"
      },
      "creationTimestamp": "2023-08-15T21:20:56Z",
      "generation": 1,
      "labels": {
        "component": "checkout-engine",
        "environment": "prod",
        "iso-country": "es",
        "product": "hii-checkout",
        "service_env": "prod",
        "service_project": "txengine",
        "service_project_id": "txengine-prod-1c85",
        "serving.knative.dev/configuration": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/configurationGeneration": "32",
        "serving.knative.dev/configurationUID": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5",
        "serving.knative.dev/routingState": "reserve",
        "serving.knative.dev/service": "isrg-es-sandbox-checkout-api",
        "serving.knative.dev/serviceUID": "91293618-35d1-4168-8902-52a955faaae1",
        "sre.canary.enabled": "false",
        "tenant-alias": "isrg-test"
      },
      "managedFields": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:status": {
              ".": {},
              "f:actualReplicas": {},
              "f:conditions": {},
              "f:containerStatuses": {},
              "f:desiredReplicas": {},
              "f:logUrl": {},
              "f:observedGeneration": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "subresource": "status",
          "time": "2023-09-12T19:24:34Z"
        },
        {
          "apiVersion": "serving.knative.dev/v1",
          "fieldsType": "FieldsV1",
          "fieldsV1": {
            "f:metadata": {
              "f:annotations": {
                ".": {},
                "f:autoscaling.knative.dev/minScale": {},
                "f:client.knative.dev/user-image": {},
                "f:run.googleapis.com/client-name": {},
                "f:run.googleapis.com/client-version": {},
                "f:serving.knative.dev/creator": {},
                "f:serving.knative.dev/routingStateModified": {}
              },
              "f:labels": {
                ".": {},
                "f:component": {},
                "f:environment": {},
                "f:iso-country": {},
                "f:product": {},
                "f:service_env": {},
                "f:service_project": {},
                "f:service_project_id": {},
                "f:serving.knative.dev/configuration": {},
                "f:serving.knative.dev/configurationGeneration": {},
                "f:serving.knative.dev/configurationUID": {},
                "f:serving.knative.dev/routingState": {},
                "f:serving.knative.dev/service": {},
                "f:serving.knative.dev/serviceUID": {},
                "f:sre.canary.enabled": {},
                "f:tenant-alias": {}
              },
              "f:ownerReferences": {
                ".": {},
                "k:{\\"uid\\":\\"719ce6e7-1202-4b68-9bae-33a5f6c99aa5\\"}": {}
              }
            },
            "f:spec": {
              ".": {},
              "f:containerConcurrency": {},
              "f:containers": {},
              "f:enableServiceLinks": {},
              "f:timeoutSeconds": {}
            }
          },
          "manager": "controller",
          "operation": "Update",
          "time": "2023-09-13T07:46:16Z"
        }
      ],
      "name": "isrg-es-sandbox-checkout-api-00062-qan",
      "namespace": "isrg-es-sandbox-checkout-api",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "isrg-es-sandbox-checkout-api",
          "uid": "719ce6e7-1202-4b68-9bae-33a5f6c99aa5"
        }
      ],
      "resourceVersion": "1339611685",
      "uid": "a835c5ce-fa2d-42ae-9063-f91e89b76a4f"
    },
    "spec": {
      "containerConcurrency": 30,
      "containers": [
        {
          "env": [
            {
              "name": "POS_NODE",
              "value": "nodes/checkout-api"
            },
            {
              "name": "HIIRETAIL_MQTT_HOST",
              "value": "vernemq.tx-vernemq-broker.svc.cluster.local"
            },
            {
              "name": "CARD_PAYMENT_HOST",
              "value": "payment-router.retailsvc.com"
            },
            {
              "name": "TE_EVENT_LINK_SCHEME",
              "value": "https"
            },
            {
              "name": "DATABASE_USER",
              "value": "postgres"
            },
            {
              "name": "DATABASE_HOST",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_private_address"
            },
            {
              "name": "DATABASE_PASSWORD",
              "value": "sm://txengine-prod-1c85/isrg_es-sandbox_postgresql_master_password"
            },
            {
              "name": "LAUNCH_DARKLY_ACCESS_KEY",
              "value": "sm://txengine-prod-1c85/launchdarkly-sdk-key"
            },
            {
              "name": "REDIS_CONNECTION_HOST",
              "value": "sm://txengine-prod-1c85/memorystore_checkout-engine_host"
            },
            {
              "name": "SINGLE_ASSORTMENT_BUSINESS_UNIT_ID",
              "value": "96D"
            },
            {
              "name": "TENANT_ID",
              "value": "W5RJB9yo0feBai6KyF6Etest"
            },
            {
              "name": "COUNTRY_MODULE",
              "value": "ES"
            },
            {
              "name": "TZ",
              "value": "Europe/Madrid"
            },
            {
              "name": "POS_PROPS_FILE",
              "value": "txengine_sandbox.properties"
            },
            {
              "name": "BUSINESS_UNIT_GROUP_ID",
              "value": "ESSprinter"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "txengine-prod-1c85"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "prod"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/isrg-checkout-engine:7566b11763f2e5a95a7bc943265756af784b23e9"
            }
          ],
          "image": "eu.gcr.io/extenda/isrg-checkout-engine:7566b11763f2e5a95a7bc943265756af784b23e9",
          "name": "user-container",
          "readinessProbe": {
            "successThreshold": 1,
            "tcpSocket": {
              "port": 0
            }
          },
          "resources": {
            "limits": {
              "cpu": "2",
              "memory": "2Gi"
            }
          }
        }
      ],
      "enableServiceLinks": false,
      "timeoutSeconds": 300
    },
    "status": {
      "actualReplicas": 0,
      "conditions": [
        {
          "lastTransitionTime": "2023-09-13T08:04:38Z",
          "message": "The target is not receiving traffic.",
          "reason": "NoTraffic",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-08-15T21:21:27Z",
          "status": "True",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-08-15T21:21:27Z",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-08-15T21:21:27Z",
          "status": "True",
          "type": "ResourcesAvailable"
        }
      ],
      "containerStatuses": [
        {
          "imageDigest": "eu.gcr.io/extenda/isrg-checkout-engine@sha256:b58e6b3bc59b1de5d6961eeedddce7ff846fb9548ba73945a0d6695ea72c61a6",
          "name": "user-container"
        }
      ],
      "desiredReplicas": 0,
      "logUrl": "https://console.cloud.google.com/logs/viewer?advancedFilter=resource.type%3D%22k8s_container%22%0Aresource.labels.container_name%3D%22user-container%22%0Alabels.%22k8s-pod%2Fserving_knative_dev%2FrevisionUID%22%3D%22a835c5ce-fa2d-42ae-9063-f91e89b76a4f%22",
      "observedGeneration": 1
    }
  }
]`;

test('It returns a sorted list of revisions', async () => {
  exec.mockImplementationOnce((cmd, args, opts) => mockOutput(GCLOUD_JSON_OUTPUT, opts));
  const revisions = await getRevisions('namespace', 'project', 'cluster', 'location');
  expect(revisions).toEqual([
    {
      name: 'isrg-es-sandbox-checkout-api-00034',
      creationTimestamp: '2023-09-12T21:32:59Z',
    },
    {
      name: 'isrg-es-sandbox-checkout-api-00062-qan',
      creationTimestamp: '2023-08-15T21:20:56Z',
    },
    {
      name: 'isrg-es-sandbox-checkout-api-00060-jut',
      creationTimestamp: '2023-08-14T19:21:29Z',
    },
    {
      name: 'isrg-es-sandbox-checkout-api-00058-tez',
      creationTimestamp: '2023-08-14T06:06:10Z',
    },
  ]);
  expect(exec).toHaveBeenCalled();
});
