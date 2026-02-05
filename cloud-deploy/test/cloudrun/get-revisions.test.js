import { expect, test, vi } from 'vitest';
vi.mock('@actions/exec');
import getRevisions from '../../src/cloudrun/get-revisions.js';
import execGcloud from '../../src/utils/gcloud-output.js';

vi.mock('../../src/utils/gcloud-output.js');

const GCLOUD_JSON_OUTPUT = `[
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/maxScale": "1",
        "autoscaling.knative.dev/minScale": "0",
        "run.googleapis.com/execution-environment": "gen2",
        "run.googleapis.com/launch-stage": "BETA",
        "run.googleapis.com/network-interfaces": "[{\\"network\\":\\"clan-network\\",\\"subnetwork\\":\\"k8s-subnet\\"}]",
        "run.googleapis.com/operation-id": "b440195b-9190-4874-9ba3-4efd0cb68974",
        "run.googleapis.com/vpc-access-egress": "all-traffic",
        "serving.knative.dev/creator": "814621934354-compute@developer.gserviceaccount.com"
      },
      "creationTimestamp": "2023-09-28T10:06:03.488086Z",
      "generation": 1,
      "labels": {
        "cloud.googleapis.com/location": "europe-west1",
        "delivery-pipeline-id": "fiscal-signing-service",
        "location": "europe-west1",
        "managed-by": "google-cloud-deploy",
        "project-id": "fiscal-staging-dc48",
        "release-id": "fiscal-signing-service-1695895526767",
        "run.googleapis.com/startupProbeType": "Custom",
        "serving.knative.dev/configuration": "fiscal-signing-service",
        "serving.knative.dev/configurationGeneration": "97",
        "serving.knative.dev/route": "fiscal-signing-service",
        "serving.knative.dev/service": "fiscal-signing-service",
        "serving.knative.dev/serviceUid": "b006e7c5-c437-4c24-ab7a-74ddbdb34cb0",
        "target-id": "cloudrun"
      },
      "name": "fiscal-signing-service-ln30f1gz",
      "namespace": "814621934354",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "fiscal-signing-service",
          "uid": "b57c117a-f4b3-47b6-9919-a92639a028d1"
        }
      ],
      "resourceVersion": "AAYGaHaouls",
      "selfLink": "/apis/serving.knative.dev/v1/namespaces/814621934354/revisions/fiscal-signing-service-ln30f1gz",
      "uid": "bb7d146a-3ecc-48fe-8194-d4fc126ccfee"
    },
    "spec": {
      "containerConcurrency": 50,
      "containers": [
        {
          "env": [
            {
              "name": "ATCUD_GRPC_HOST",
              "value": "sm://fiscal-staging-dc48/fsc-atcud-grpc-host"
            },
            {
              "name": "ATCUD_GRPC_PORT",
              "value": "443"
            },
            {
              "name": "LOGBACK_APPENDER",
              "value": "cloud"
            },
            {
              "name": "LAUNCHDARKLY_SDK_KEY",
              "value": "sm://fiscal-staging-dc48/fsc-launchdarkly-sdk-key"
            },
            {
              "name": "SERVICE_NAME",
              "value": "fiscal-signing-service"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "fiscal-staging-dc48"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "staging"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/fiscal-signing-service:c90b9a2995d50d2de7faf14b6a9e94c2e4d7f92d"
            },
            {
              "name": "CLAN_NAME",
              "value": "fiscal"
            }
          ],
          "image": "eu.gcr.io/extenda/fiscal-signing-service@sha256:1c93e85778497dc2218e017bd4edbd8431d9ab3dcca9b08aa3453e0c565a8cd2",
          "name": "user-container",
          "ports": [
            {
              "containerPort": 8080,
              "name": "http1"
            }
          ],
          "resources": {
            "limits": {
              "cpu": "1",
              "memory": "1Gi"
            }
          },
          "startupProbe": {
            "failureThreshold": 10,
            "initialDelaySeconds": 3,
            "periodSeconds": 5,
            "tcpSocket": {
              "port": 8080
            },
            "timeoutSeconds": 3
          }
        }
      ],
      "serviceAccountName": "fiscal-signing-service@fiscal-staging-dc48.iam.gserviceaccount.com",
      "timeoutSeconds": 300
    },
    "status": {
      "conditions": [
        {
          "lastTransitionTime": "2023-09-28T10:06:32.015474Z",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:37.406528Z",
          "severity": "Info",
          "status": "True",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:31.933233Z",
          "status": "True",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:10.123708Z",
          "severity": "Error",
          "status": "True",
          "type": "ResourcesAvailable"
        }
      ],
      "imageDigest": "eu.gcr.io/extenda/fiscal-signing-service@sha256:1c93e85778497dc2218e017bd4edbd8431d9ab3dcca9b08aa3453e0c565a8cd2",
      "logUrl": "https://console.cloud.google.com/logs/viewer?project=fiscal-staging-dc48&resource=cloud_run_revision/service_name/fiscal-signing-service/revision_name/fiscal-signing-service-ln30f1gz&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22fiscal-signing-service%22%0Aresource.labels.revision_name%3D%22fiscal-signing-service-ln30f1gz%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/maxScale": "1",
        "autoscaling.knative.dev/minScale": "1",
        "run.googleapis.com/client-name": "cloud-console",
        "run.googleapis.com/execution-environment": "gen2",
        "run.googleapis.com/launch-stage": "BETA",
        "run.googleapis.com/network-interfaces": "[{\\"network\\":\\"clan-network\\",\\"subnetwork\\":\\"k8s-subnet\\"}]",
        "run.googleapis.com/operation-id": "b440195b-9190-4874-9ba3-4efd0cb68974",
        "run.googleapis.com/vpc-access-egress": "all-traffic",
        "serving.knative.dev/creator": "alexander.l.santos@extendaretail.com"
      },
      "creationTimestamp": "2023-09-28T09:11:12.919435Z",
      "generation": 1,
      "labels": {
        "client.knative.dev/nonce": "421829ac-5185-479e-a83c-66f3eb24d229",
        "cloud.googleapis.com/location": "europe-west1",
        "delivery-pipeline-id": "fiscal-signing-service",
        "location": "europe-west1",
        "managed-by": "google-cloud-deploy",
        "project-id": "fiscal-staging-dc48",
        "release-id": "fiscal-signing-service-1695891038545",
        "run.googleapis.com/startupProbeType": "Custom",
        "serving.knative.dev/configuration": "fiscal-signing-service",
        "serving.knative.dev/configurationGeneration": "96",
        "serving.knative.dev/service": "fiscal-signing-service",
        "serving.knative.dev/serviceUid": "b006e7c5-c437-4c24-ab7a-74ddbdb34cb0",
        "target-id": "cloudrun"
      },
      "name": "fiscal-signing-service-00096-s25",
      "namespace": "814621934354",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "fiscal-signing-service",
          "uid": "b57c117a-f4b3-47b6-9919-a92639a028d1"
        }
      ],
      "resourceVersion": "AAYGaHasZQ4",
      "selfLink": "/apis/serving.knative.dev/v1/namespaces/814621934354/revisions/fiscal-signing-service-00096-s25",
      "uid": "728e63c8-e7ee-4815-a90b-7eb4c780fa2d"
    },
    "spec": {
      "containerConcurrency": 50,
      "containers": [
        {
          "env": [
            {
              "name": "ATCUD_GRPC_HOST",
              "value": "sm://fiscal-staging-dc48/fsc-atcud-grpc-host"
            },
            {
              "name": "ATCUD_GRPC_PORT",
              "value": "443"
            },
            {
              "name": "LOGBACK_APPENDER",
              "value": "cloud"
            },
            {
              "name": "LAUNCHDARKLY_SDK_KEY",
              "value": "sm://fiscal-staging-dc48/fsc-launchdarkly-sdk-key"
            },
            {
              "name": "SERVICE_NAME",
              "value": "fiscal-signing-service"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "fiscal-staging-dc48"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "staging"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/fiscal-signing-service:c90b9a2995d50d2de7faf14b6a9e94c2e4d7f92d"
            },
            {
              "name": "CLAN_NAME",
              "value": "fiscal"
            }
          ],
          "image": "eu.gcr.io/extenda/fiscal-signing-service@sha256:2b91d8f2460cd4c47e8e4db42c204734e1454d57e8ec1a0df3e5bf5d54f17007",
          "name": "user-container",
          "ports": [
            {
              "containerPort": 8080,
              "name": "http1"
            }
          ],
          "resources": {
            "limits": {
              "cpu": "1000m",
              "memory": "1Gi"
            }
          },
          "startupProbe": {
            "failureThreshold": 10,
            "initialDelaySeconds": 3,
            "periodSeconds": 5,
            "tcpSocket": {
              "port": 8080
            },
            "timeoutSeconds": 3
          }
        }
      ],
      "serviceAccountName": "fiscal-signing-service@fiscal-staging-dc48.iam.gserviceaccount.com",
      "timeoutSeconds": 300
    },
    "status": {
      "conditions": [
        {
          "lastTransitionTime": "2023-09-28T10:06:37.638926Z",
          "reason": "Retired",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:37.638926Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:37.638926Z",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:37.638926Z",
          "reason": "NotProvisioned",
          "severity": "Info",
          "status": "False",
          "type": "MinInstancesProvisioned"
        },
        {
          "lastTransitionTime": "2023-09-28T10:06:37.638926Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ResourcesAvailable"
        }
      ],
      "imageDigest": "eu.gcr.io/extenda/fiscal-signing-service@sha256:2b91d8f2460cd4c47e8e4db42c204734e1454d57e8ec1a0df3e5bf5d54f17007",
      "logUrl": "https://console.cloud.google.com/logs/viewer?project=fiscal-staging-dc48&resource=cloud_run_revision/service_name/fiscal-signing-service/revision_name/fiscal-signing-service-00096-s25&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22fiscal-signing-service%22%0Aresource.labels.revision_name%3D%22fiscal-signing-service-00096-s25%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/maxScale": "1",
        "autoscaling.knative.dev/minScale": "0",
        "run.googleapis.com/execution-environment": "gen2",
        "run.googleapis.com/launch-stage": "BETA",
        "run.googleapis.com/network-interfaces": "[{\\"network\\":\\"clan-network\\",\\"subnetwork\\":\\"k8s-subnet\\"}]",
        "run.googleapis.com/operation-id": "b982c1d5-8637-4123-8243-1a0156a9b27f",
        "run.googleapis.com/vpc-access-egress": "all-traffic",
        "serving.knative.dev/creator": "814621934354-compute@developer.gserviceaccount.com"
      },
      "creationTimestamp": "2023-09-28T08:51:12.221528Z",
      "generation": 1,
      "labels": {
        "cloud.googleapis.com/location": "europe-west1",
        "delivery-pipeline-id": "fiscal-signing-service",
        "location": "europe-west1",
        "managed-by": "google-cloud-deploy",
        "project-id": "fiscal-staging-dc48",
        "release-id": "fiscal-signing-service-1695891038545",
        "run.googleapis.com/startupProbeType": "Custom",
        "serving.knative.dev/configuration": "fiscal-signing-service",
        "serving.knative.dev/configurationGeneration": "95",
        "serving.knative.dev/service": "fiscal-signing-service",
        "serving.knative.dev/serviceUid": "b006e7c5-c437-4c24-ab7a-74ddbdb34cb0",
        "target-id": "cloudrun"
      },
      "name": "fiscal-signing-service-ln2xqs4o",
      "namespace": "814621934354",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "fiscal-signing-service",
          "uid": "b57c117a-f4b3-47b6-9919-a92639a028d1"
        }
      ],
      "resourceVersion": "AAYGZ7LOBf4",
      "selfLink": "/apis/serving.knative.dev/v1/namespaces/814621934354/revisions/fiscal-signing-service-ln2xqs4o",
      "uid": "3148773d-b7fd-4a60-82d1-e64f5c0f4972"
    },
    "spec": {
      "containerConcurrency": 50,
      "containers": [
        {
          "env": [
            {
              "name": "ATCUD_GRPC_HOST",
              "value": "sm://fiscal-staging-dc48/fsc-atcud-grpc-host"
            },
            {
              "name": "ATCUD_GRPC_PORT",
              "value": "443"
            },
            {
              "name": "LOGBACK_APPENDER",
              "value": "cloud"
            },
            {
              "name": "LAUNCHDARKLY_SDK_KEY",
              "value": "sm://fiscal-staging-dc48/fsc-launchdarkly-sdk-key"
            },
            {
              "name": "SERVICE_NAME",
              "value": "fiscal-signing-service"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "fiscal-staging-dc48"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "staging"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/fiscal-signing-service:c90b9a2995d50d2de7faf14b6a9e94c2e4d7f92d"
            },
            {
              "name": "CLAN_NAME",
              "value": "fiscal"
            }
          ],
          "image": "eu.gcr.io/extenda/fiscal-signing-service@sha256:2b91d8f2460cd4c47e8e4db42c204734e1454d57e8ec1a0df3e5bf5d54f17007",
          "name": "user-container",
          "ports": [
            {
              "containerPort": 8080,
              "name": "http1"
            }
          ],
          "resources": {
            "limits": {
              "cpu": "1",
              "memory": "1Gi"
            }
          },
          "startupProbe": {
            "failureThreshold": 10,
            "initialDelaySeconds": 3,
            "periodSeconds": 5,
            "tcpSocket": {
              "port": 8080
            },
            "timeoutSeconds": 3
          }
        }
      ],
      "serviceAccountName": "fiscal-signing-service@fiscal-staging-dc48.iam.gserviceaccount.com",
      "timeoutSeconds": 300
    },
    "status": {
      "conditions": [
        {
          "lastTransitionTime": "2023-09-28T09:11:51.508478Z",
          "reason": "Retired",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-09-28T09:11:51.508478Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-09-28T09:11:51.508478Z",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-09-28T09:11:51.508478Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ResourcesAvailable"
        }
      ],
      "imageDigest": "eu.gcr.io/extenda/fiscal-signing-service@sha256:2b91d8f2460cd4c47e8e4db42c204734e1454d57e8ec1a0df3e5bf5d54f17007",
      "logUrl": "https://console.cloud.google.com/logs/viewer?project=fiscal-staging-dc48&resource=cloud_run_revision/service_name/fiscal-signing-service/revision_name/fiscal-signing-service-ln2xqs4o&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22fiscal-signing-service%22%0Aresource.labels.revision_name%3D%22fiscal-signing-service-ln2xqs4o%22",
      "observedGeneration": 1
    }
  },
  {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Revision",
    "metadata": {
      "annotations": {
        "autoscaling.knative.dev/maxScale": "1",
        "autoscaling.knative.dev/minScale": "0",
        "run.googleapis.com/execution-environment": "gen2",
        "run.googleapis.com/launch-stage": "BETA",
        "run.googleapis.com/network-interfaces": "[{\\"network\\":\\"clan-network\\",\\"subnetwork\\":\\"k8s-subnet\\"}]",
        "run.googleapis.com/operation-id": "d01b505a-2e41-41c0-b197-f70e4c1a466b",
        "run.googleapis.com/vpc-access-egress": "all-traffic",
        "serving.knative.dev/creator": "814621934354-compute@developer.gserviceaccount.com"
      },
      "creationTimestamp": "2023-09-28T08:18:55.518248Z",
      "generation": 1,
      "labels": {
        "cloud.googleapis.com/location": "europe-west1",
        "delivery-pipeline-id": "fiscal-signing-service",
        "location": "europe-west1",
        "managed-by": "google-cloud-deploy",
        "project-id": "fiscal-staging-dc48",
        "release-id": "fiscal-signing-service-1695889100232",
        "run.googleapis.com/startupProbeType": "Custom",
        "serving.knative.dev/configuration": "fiscal-signing-service",
        "serving.knative.dev/configurationGeneration": "94",
        "serving.knative.dev/service": "fiscal-signing-service",
        "serving.knative.dev/serviceUid": "b006e7c5-c437-4c24-ab7a-74ddbdb34cb0",
        "target-id": "cloudrun"
      },
      "name": "fiscal-signing-service-ln2wl9pg",
      "namespace": "814621934354",
      "ownerReferences": [
        {
          "apiVersion": "serving.knative.dev/v1",
          "blockOwnerDeletion": true,
          "controller": true,
          "kind": "Configuration",
          "name": "fiscal-signing-service",
          "uid": "b57c117a-f4b3-47b6-9919-a92639a028d1"
        }
      ],
      "resourceVersion": "AAYGZ2tfvrg",
      "selfLink": "/apis/serving.knative.dev/v1/namespaces/814621934354/revisions/fiscal-signing-service-ln2wl9pg",
      "uid": "20bd24c9-c384-42db-ab5d-12b8e7faddf3"
    },
    "spec": {
      "containerConcurrency": 50,
      "containers": [
        {
          "env": [
            {
              "name": "ATCUD_GRPC_HOST",
              "value": "sm://fiscal-staging-dc48/fsc-atcud-grpc-host"
            },
            {
              "name": "ATCUD_GRPC_PORT",
              "value": "443"
            },
            {
              "name": "LOGBACK_APPENDER",
              "value": "cloud"
            },
            {
              "name": "LAUNCHDARKLY_SDK_KEY",
              "value": "sm://fiscal-staging-dc48/fsc-launchdarkly-sdk-key"
            },
            {
              "name": "SERVICE_NAME",
              "value": "fiscal-signing-service"
            },
            {
              "name": "SERVICE_PROJECT_ID",
              "value": "fiscal-staging-dc48"
            },
            {
              "name": "SERVICE_ENVIRONMENT",
              "value": "staging"
            },
            {
              "name": "SERVICE_CONTAINER_IMAGE",
              "value": "eu.gcr.io/extenda/fiscal-signing-service:770e9278cab33fbf8a792b78136e3bbec3a2621b"
            },
            {
              "name": "CLAN_NAME",
              "value": "fiscal"
            }
          ],
          "image": "eu.gcr.io/extenda/fiscal-signing-service@sha256:ee0ce46798e4b3307c9f415e27748e4ecb2b4ef1adbe238d61cabb7381e9898d",
          "name": "user-container",
          "ports": [
            {
              "containerPort": 8080,
              "name": "http1"
            }
          ],
          "resources": {
            "limits": {
              "cpu": "1",
              "memory": "512Mi"
            }
          },
          "startupProbe": {
            "failureThreshold": 10,
            "initialDelaySeconds": 3,
            "periodSeconds": 5,
            "tcpSocket": {
              "port": 8080
            },
            "timeoutSeconds": 3
          }
        }
      ],
      "serviceAccountName": "fiscal-signing-service@fiscal-staging-dc48.iam.gserviceaccount.com",
      "timeoutSeconds": 300
    },
    "status": {
      "conditions": [
        {
          "lastTransitionTime": "2023-09-28T08:51:53.098936Z",
          "reason": "Retired",
          "status": "True",
          "type": "Ready"
        },
        {
          "lastTransitionTime": "2023-09-28T08:51:53.098936Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "severity": "Info",
          "status": "False",
          "type": "Active"
        },
        {
          "lastTransitionTime": "2023-09-28T08:51:53.098936Z",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ContainerHealthy"
        },
        {
          "lastTransitionTime": "2023-09-28T08:51:53.098936Z",
          "message": "Revision retired.",
          "reason": "Retired",
          "status": "Unknown",
          "type": "ResourcesAvailable"
        }
      ],
      "imageDigest": "eu.gcr.io/extenda/fiscal-signing-service@sha256:ee0ce46798e4b3307c9f415e27748e4ecb2b4ef1adbe238d61cabb7381e9898d",
      "logUrl": "https://console.cloud.google.com/logs/viewer?project=fiscal-staging-dc48&resource=cloud_run_revision/service_name/fiscal-signing-service/revision_name/fiscal-signing-service-ln2wl9pg&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22fiscal-signing-service%22%0Aresource.labels.revision_name%3D%22fiscal-signing-service-ln2wl9pg%22",
      "observedGeneration": 1
    }
  }
]
`;

test('It returns a sorted list of revisions', async () => {
  execGcloud.mockResolvedValueOnce(GCLOUD_JSON_OUTPUT);
  const revisions = await getRevisions(
    'fiscal-signing-service',
    'fiscal-staging-dc48',
    'europe-west1',
  );
  expect(revisions).toEqual([
    {
      name: 'fiscal-signing-service-ln30f1gz',
      creationTimestamp: '2023-09-28T10:06:03.488086Z',
      active: true,
    },
    {
      name: 'fiscal-signing-service-00096-s25',
      creationTimestamp: '2023-09-28T09:11:12.919435Z',
      active: false,
    },
    {
      name: 'fiscal-signing-service-ln2xqs4o',
      creationTimestamp: '2023-09-28T08:51:12.221528Z',
      active: false,
    },
    {
      name: 'fiscal-signing-service-ln2wl9pg',
      creationTimestamp: '2023-09-28T08:18:55.518248Z',
      active: false,
    },
  ]);
  expect(execGcloud).toHaveBeenCalledWith(
    expect.arrayContaining([
      '--service=fiscal-signing-service',
      '--project=fiscal-staging-dc48',
      '--region=europe-west1',
      '--format=json',
    ]),
    'gcloud',
    expect.anything(),
    expect.anything(),
  );
});
