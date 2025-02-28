# CloudDeploy

- [1. Property `CloudDeploy > oneOf > CloudRun`](#oneOf_i0)
  - [1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run`](#oneOf_i0_cloud-run)
    - [1.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > service`](#oneOf_i0_cloud-run_service)
    - [1.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > resources`](#oneOf_i0_cloud-run_resources)
    - [1.1.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > protocol`](#oneOf_i0_cloud-run_protocol)
    - [1.1.4. Property `CloudDeploy > oneOf > CloudRun > cloud-run > timeout`](#oneOf_i0_cloud-run_timeout)
    - [1.1.5. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling`](#oneOf_i0_cloud-run_scaling)
      - [1.1.5.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > concurrency`](#oneOf_i0_cloud-run_scaling_concurrency)
      - [1.1.5.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule`](#oneOf_i0_cloud-run_scaling_schedule)
        - [1.1.5.2.1. CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling](#oneOf_i0_cloud-run_scaling_schedule_items)
          - [1.1.5.2.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling > scale-hours`](#oneOf_i0_cloud-run_scaling_schedule_items_scale-hours)
          - [1.1.5.2.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling > region`](#oneOf_i0_cloud-run_scaling_schedule_items_region)
    - [1.1.6. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic`](#oneOf_i0_cloud-run_traffic)
      - [1.1.6.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > serve-traffic`](#oneOf_i0_cloud-run_traffic_serve-traffic)
      - [1.1.6.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > static-egress-ip`](#oneOf_i0_cloud-run_traffic_static-egress-ip)
      - [1.1.6.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > direct-vpc-connection`](#oneOf_i0_cloud-run_traffic_direct-vpc-connection)
    - [1.1.7. Property `CloudDeploy > oneOf > CloudRun > cloud-run > startup-cpu-boost`](#oneOf_i0_cloud-run_startup-cpu-boost)
    - [1.1.8. Property `CloudDeploy > oneOf > CloudRun > cloud-run > cpu-throttling`](#oneOf_i0_cloud-run_cpu-throttling)
    - [1.1.9. Property `CloudDeploy > oneOf > CloudRun > cloud-run > session-affinity`](#oneOf_i0_cloud-run_session-affinity)
    - [1.1.10. Property `CloudDeploy > oneOf > CloudRun > cloud-run > vpc-connector`](#oneOf_i0_cloud-run_vpc-connector)
    - [1.1.11. Property `CloudDeploy > oneOf > CloudRun > cloud-run > internal-traffic`](#oneOf_i0_cloud-run_internal-traffic)
    - [1.1.12. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring`](#oneOf_i0_cloud-run_monitoring)
      - [1.1.12.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus`](#oneOf_i0_cloud-run_monitoring_prometheus)
        - [1.1.12.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > interval`](#oneOf_i0_cloud-run_monitoring_prometheus_interval)
        - [1.1.12.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > path`](#oneOf_i0_cloud-run_monitoring_prometheus_path)
        - [1.1.12.1.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > port`](#oneOf_i0_cloud-run_monitoring_prometheus_port)
- [2. Property `CloudDeploy > oneOf > Kubernetes`](#oneOf_i1)
  - [2.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes`](#oneOf_i1_kubernetes)
    - [2.1.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > service`](#oneOf_i1_kubernetes_service)
    - [2.1.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > type`](#oneOf_i1_kubernetes_type)
    - [2.1.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > resources`](#oneOf_i1_kubernetes_resources)
    - [2.1.4. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > protocol`](#oneOf_i1_kubernetes_protocol)
    - [2.1.5. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > timeout`](#oneOf_i1_kubernetes_timeout)
    - [2.1.6. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > availability`](#oneOf_i1_kubernetes_availability)
    - [2.1.7. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling`](#oneOf_i1_kubernetes_scaling)
      - [2.1.7.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > cpu`](#oneOf_i1_kubernetes_scaling_cpu)
      - [2.1.7.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical`](#oneOf_i1_kubernetes_scaling_vertical)
        - [2.1.7.2.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > threshold`](#oneOf_i1_kubernetes_scaling_vertical_threshold)
        - [2.1.7.2.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > increments-cpu`](#oneOf_i1_kubernetes_scaling_vertical_increments-cpu)
        - [2.1.7.2.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > max-cpu`](#oneOf_i1_kubernetes_scaling_vertical_max-cpu)
        - [2.1.7.2.4. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > max-memory`](#oneOf_i1_kubernetes_scaling_vertical_max-memory)
    - [2.1.8. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes`](#oneOf_i1_kubernetes_volumes)
      - [2.1.8.1. CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume](#oneOf_i1_kubernetes_volumes_items)
        - [2.1.8.1.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > disk-type`](#oneOf_i1_kubernetes_volumes_items_disk-type)
        - [2.1.8.1.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > size`](#oneOf_i1_kubernetes_volumes_items_size)
        - [2.1.8.1.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > mount-path`](#oneOf_i1_kubernetes_volumes_items_mount-path)
    - [2.1.9. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > monitoring`](#oneOf_i1_kubernetes_monitoring)
- [3. Property `CloudDeploy > labels`](#labels)
  - [3.1. Property `CloudDeploy > labels > component`](#labels_component)
  - [3.2. Property `CloudDeploy > labels > product`](#labels_product)
  - [3.3. Property `CloudDeploy > labels > iso-country`](#labels_iso-country)
  - [3.4. Property `CloudDeploy > labels > tenant-alias`](#labels_tenant-alias)
  - [3.5. Pattern Property `CloudDeploy > labels > Label`](#labels_pattern1)
- [4. Property `CloudDeploy > security`](#security)
  - [4.1. Property `CloudDeploy > security > oneOf > SecurityNone`](#security_oneOf_i0)
  - [4.2. Property `CloudDeploy > security > oneOf > IAMSettings`](#security_oneOf_i1)
    - [4.2.1. Property `CloudDeploy > security > oneOf > IAMSettings > permission-prefix`](#security_oneOf_i1_permission-prefix)
    - [4.2.2. Property `CloudDeploy > security > oneOf > IAMSettings > auth-proxy`](#security_oneOf_i1_auth-proxy)
    - [4.2.3. Property `CloudDeploy > security > oneOf > IAMSettings > system-name`](#security_oneOf_i1_system-name)
    - [4.2.4. Property `CloudDeploy > security > oneOf > IAMSettings > resources`](#security_oneOf_i1_resources)
      - [4.2.4.1. Property `CloudDeploy > security > oneOf > IAMSettings > resources > cpu`](#security_oneOf_i1_resources_cpu)
      - [4.2.4.2. Property `CloudDeploy > security > oneOf > IAMSettings > resources > memory`](#security_oneOf_i1_resources_memory)
    - [4.2.5. Property `CloudDeploy > security > oneOf > IAMSettings > cloud-armor`](#security_oneOf_i1_cloud-armor)
      - [4.2.5.1. Property `CloudDeploy > security > oneOf > IAMSettings > cloud-armor > policy-name`](#security_oneOf_i1_cloud-armor_policy-name)
  - [4.3. Property `CloudDeploy > security > oneOf > IAMBindingSettings`](#security_oneOf_i2)
    - [4.3.1. Property `CloudDeploy > security > oneOf > IAMBindingSettings > cloud-armor`](#security_oneOf_i2_cloud-armor)
    - [4.3.2. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers`](#security_oneOf_i2_consumers)
      - [4.3.2.1. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers > service-accounts`](#security_oneOf_i2_consumers_service-accounts)
        - [4.3.2.1.1. CloudDeploy > security > oneOf > IAMBindingSettings > consumers > service-accounts > ConsumerAccount](#security_oneOf_i2_consumers_service-accounts_items)
      - [4.3.2.2. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers > audiences`](#security_oneOf_i2_consumers_audiences)
        - [4.3.2.2.1. CloudDeploy > security > oneOf > IAMBindingSettings > consumers > audiences > ConsumerAudience](#security_oneOf_i2_consumers_audiences_items)
  - [4.4. Property `CloudDeploy > security > oneOf > CloudArmor`](#security_oneOf_i3)
    - [4.4.1. Property `CloudDeploy > security > oneOf > CloudArmor > cloud-armor`](#security_oneOf_i3_cloud-armor)
- [5. Property `CloudDeploy > environments`](#environments)
  - [5.1. Property `CloudDeploy > environments > production`](#environments_production)
    - [5.1.1. Property `CloudDeploy > environments > production > min-instances`](#environments_production_min-instances)
    - [5.1.2. Property `CloudDeploy > environments > production > max-instances`](#environments_production_max-instances)
    - [5.1.3. Property `CloudDeploy > environments > production > domain-mappings`](#environments_production_domain-mappings)
      - [5.1.3.1. CloudDeploy > environments > production > domain-mappings > Domain](#environments_production_domain-mappings_items)
    - [5.1.4. Property `CloudDeploy > environments > production > path-mappings`](#environments_production_path-mappings)
      - [5.1.4.1. CloudDeploy > environments > production > path-mappings > PathRule](#environments_production_path-mappings_items)
        - [5.1.4.1.1. Property `CloudDeploy > environments > production > path-mappings > PathRule > oneOf`](#environments_production_path-mappings_items_oneOf)
        - [5.1.4.1.2. Property `CloudDeploy > environments > production > path-mappings > PathRule > paths`](#environments_production_path-mappings_items_paths)
          - [5.1.4.1.2.1. CloudDeploy > environments > production > path-mappings > PathRule > paths > path](#environments_production_path-mappings_items_paths_items)
        - [5.1.4.1.3. Property `CloudDeploy > environments > production > path-mappings > PathRule > path-rewrite`](#environments_production_path-mappings_items_path-rewrite)
    - [5.1.5. Property `CloudDeploy > environments > production > env`](#environments_production_env)
      - [5.1.5.1. Pattern Property `CloudDeploy > environments > production > env > EnvVar`](#environments_production_env_pattern1)
    - [5.1.6. Property `CloudDeploy > environments > production > regions`](#environments_production_regions)
      - [5.1.6.1. CloudDeploy > environments > production > regions > GoogleRegion](#environments_production_regions_items)
  - [5.2. Property `CloudDeploy > environments > staging`](#environments_staging)
    - [5.2.1. Property `CloudDeploy > environments > staging > oneOf > StagingNone`](#environments_staging_oneOf_i0)
    - [5.2.2. Property `CloudDeploy > environments > staging > oneOf > Environment`](#environments_staging_oneOf_i1)

**Title:** CloudDeploy

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `combining`      |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

| Property                         | Pattern | Type   | Deprecated | Definition              | Title/Description |
| -------------------------------- | ------- | ------ | ---------- | ----------------------- | ----------------- |
| + [labels](#labels )             | No      | object | No         | In #/$defs/Labels       | Labels            |
| + [security](#security )         | No      | object | No         | In #/$defs/Security     | Security          |
| + [environments](#environments ) | No      | object | No         | In #/$defs/Environments | Environments      |

| One of(Option)          |
| ----------------------- |
| [CloudRun](#oneOf_i0)   |
| [Kubernetes](#oneOf_i1) |

## <a name="oneOf_i0"></a>1. Property `CloudDeploy > oneOf > CloudRun`

**Title:** CloudRun

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

| Property                            | Pattern | Type   | Deprecated | Definition          | Title/Description |
| ----------------------------------- | ------- | ------ | ---------- | ------------------- | ----------------- |
| + [cloud-run](#oneOf_i0_cloud-run ) | No      | object | No         | In #/$defs/CloudRun | CloudRun          |

### <a name="oneOf_i0_cloud-run"></a>1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run`

**Title:** CloudRun

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Not allowed      |
| **Defined in**            | #/$defs/CloudRun |

**Description:** Managed Cloud Run service

| Property                                                      | Pattern | Type             | Deprecated | Definition                                         | Title/Description                                                                |
| ------------------------------------------------------------- | ------- | ---------------- | ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| + [service](#oneOf_i0_cloud-run_service )                     | No      | string           | No         | In #/$defs/ServiceName                             | ServiceName                                                                      |
| + [resources](#oneOf_i0_cloud-run_resources )                 | No      | object           | No         | Same as [resources](#security_oneOf_i1_resources ) | Resources                                                                        |
| + [protocol](#oneOf_i0_cloud-run_protocol )                   | No      | enum (of string) | No         | In #/$defs/Protocol                                | Protocol                                                                         |
| - [timeout](#oneOf_i0_cloud-run_timeout )                     | No      | integer          | No         | In #/$defs/RequestTimeout                          | RequestTimeout                                                                   |
| + [scaling](#oneOf_i0_cloud-run_scaling )                     | No      | object           | No         | -                                                  | ScalingCloudRun                                                                  |
| - [traffic](#oneOf_i0_cloud-run_traffic )                     | No      | object           | No         | -                                                  | TrafficCloudRun                                                                  |
| - [startup-cpu-boost](#oneOf_i0_cloud-run_startup-cpu-boost ) | No      | boolean          | No         | -                                                  | Whether to allocate extra CPU to containers on startup.                          |
| - [cpu-throttling](#oneOf_i0_cloud-run_cpu-throttling )       | No      | boolean          | No         | -                                                  | Whether to throttle the CPU when the container is not actively serving requests. |
| - [session-affinity](#oneOf_i0_cloud-run_session-affinity )   | No      | boolean          | No         | -                                                  | Whether to enable session affinity for connections to the service.               |
| - [vpc-connector](#oneOf_i0_cloud-run_vpc-connector )         | No      | boolean          | No         | -                                                  | Whether to use the vpc connector or direct connection to the vpc                 |
| - [internal-traffic](#oneOf_i0_cloud-run_internal-traffic )   | No      | boolean          | No         | -                                                  | Whether to setup internal traffic or not                                         |
| - [monitoring](#oneOf_i0_cloud-run_monitoring )               | No      | object           | No         | In #/$defs/Monitoring                              | Monitoring                                                                       |

#### <a name="oneOf_i0_cloud-run_service"></a>1.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > service`

**Title:** ServiceName

|                |                     |
| -------------- | ------------------- |
| **Type**       | `string`            |
| **Required**   | Yes                 |
| **Defined in** | #/$defs/ServiceName |

**Description:** Service name

#### <a name="oneOf_i0_cloud-run_resources"></a>1.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > resources`

**Title:** Resources

|                           |                                           |
| ------------------------- | ----------------------------------------- |
| **Type**                  | `object`                                  |
| **Required**              | Yes                                       |
| **Additional properties** | Any type allowed                          |
| **Same definition as**    | [resources](#security_oneOf_i1_resources) |

**Description:** The requested resources

#### <a name="oneOf_i0_cloud-run_protocol"></a>1.1.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > protocol`

**Title:** Protocol

|                |                    |
| -------------- | ------------------ |
| **Type**       | `enum (of string)` |
| **Required**   | Yes                |
| **Defined in** | #/$defs/Protocol   |

**Description:** The type of protocol. Make sure to set http2 if this service is using gRPC or WebSockets

Must be one of:
* "http"
* "http2"

#### <a name="oneOf_i0_cloud-run_timeout"></a>1.1.4. Property `CloudDeploy > oneOf > CloudRun > cloud-run > timeout`

**Title:** RequestTimeout

|                |                        |
| -------------- | ---------------------- |
| **Type**       | `integer`              |
| **Required**   | No                     |
| **Default**    | `300`                  |
| **Defined in** | #/$defs/RequestTimeout |

**Description:** The request timeout in seconds

| Restrictions |           |
| ------------ | --------- |
| **Minimum**  | &ge; 1    |
| **Maximum**  | &le; 3600 |

#### <a name="oneOf_i0_cloud-run_scaling"></a>1.1.5. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling`

**Title:** ScalingCloudRun

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | Yes         |
| **Additional properties** | Not allowed |

**Description:** Scaling settings for Cloud Run

| Property                                                  | Pattern | Type    | Deprecated | Definition | Title/Description                                          |
| --------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ---------------------------------------------------------- |
| + [concurrency](#oneOf_i0_cloud-run_scaling_concurrency ) | No      | integer | No         | -          | Concurrent number of requests that an instance can handle. |
| - [schedule](#oneOf_i0_cloud-run_scaling_schedule )       | No      | array   | No         | -          | -                                                          |

##### <a name="oneOf_i0_cloud-run_scaling_concurrency"></a>1.1.5.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > concurrency`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | Yes       |

**Description:** Concurrent number of requests that an instance can handle.

| Restrictions |           |
| ------------ | --------- |
| **Minimum**  | &ge; 1    |
| **Maximum**  | &le; 1000 |

##### <a name="oneOf_i0_cloud-run_scaling_schedule"></a>1.1.5.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                | Description                |
| -------------------------------------------------------------- | -------------------------- |
| [ScheduledScaling](#oneOf_i0_cloud-run_scaling_schedule_items) | Scale in and out on demand |

###### <a name="oneOf_i0_cloud-run_scaling_schedule_items"></a>1.1.5.2.1. CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling

**Title:** ScheduledScaling

|                           |                          |
| ------------------------- | ------------------------ |
| **Type**                  | `object`                 |
| **Required**              | No                       |
| **Additional properties** | Not allowed              |
| **Defined in**            | #/$defs/ScheduledScaling |

**Description:** Scale in and out on demand

| Property                                                                 | Pattern | Type   | Deprecated | Definition | Title/Description                                |
| ------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ------------------------------------------------ |
| + [scale-hours](#oneOf_i0_cloud-run_scaling_schedule_items_scale-hours ) | No      | string | No         | -          | A string representing the hours to be scaled out |
| - [region](#oneOf_i0_cloud-run_scaling_schedule_items_region )           | No      | string | No         | -          | The region to target                             |

###### <a name="oneOf_i0_cloud-run_scaling_schedule_items_scale-hours"></a>1.1.5.2.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling > scale-hours`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A string representing the hours to be scaled out

| Restrictions                      |                                                                                                                                                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Must match regular expression** | ```^[0-2]{1}[0-9]{1}:[0-5]{1}[0-9]{1}-[0-2]{1}[0-9]{1}:[0-5]{1}[0-9]{1}``` [Test](https://regex101.com/?regex=%5E%5B0-2%5D%7B1%7D%5B0-9%5D%7B1%7D%3A%5B0-5%5D%7B1%7D%5B0-9%5D%7B1%7D-%5B0-2%5D%7B1%7D%5B0-9%5D%7B1%7D%3A%5B0-5%5D%7B1%7D%5B0-9%5D%7B1%7D) |

###### <a name="oneOf_i0_cloud-run_scaling_schedule_items_region"></a>1.1.5.2.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > scaling > schedule > ScheduledScaling > region`

|              |                  |
| ------------ | ---------------- |
| **Type**     | `string`         |
| **Required** | No               |
| **Default**  | `"europe-west1"` |

**Description:** The region to target

#### <a name="oneOf_i0_cloud-run_traffic"></a>1.1.6. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic`

**Title:** TrafficCloudRun

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** Traffic settings for Cloud Run

| Property                                                                      | Pattern | Type    | Deprecated | Definition | Title/Description                                                |
| ----------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ---------------------------------------------------------------- |
| - [serve-traffic](#oneOf_i0_cloud-run_traffic_serve-traffic )                 | No      | boolean | No         | -          | Deploy revision with or without traffic                          |
| + [static-egress-ip](#oneOf_i0_cloud-run_traffic_static-egress-ip )           | No      | boolean | No         | -          | Use the NAT router when making external requests                 |
| + [direct-vpc-connection](#oneOf_i0_cloud-run_traffic_direct-vpc-connection ) | No      | boolean | No         | -          | Whether to use the vpc connector or direct connection to the vpc |

##### <a name="oneOf_i0_cloud-run_traffic_serve-traffic"></a>1.1.6.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > serve-traffic`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `true`    |

**Description:** Deploy revision with or without traffic

##### <a name="oneOf_i0_cloud-run_traffic_static-egress-ip"></a>1.1.6.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > static-egress-ip`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |
| **Default**  | `true`    |

**Description:** Use the NAT router when making external requests

##### <a name="oneOf_i0_cloud-run_traffic_direct-vpc-connection"></a>1.1.6.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > traffic > direct-vpc-connection`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |
| **Default**  | `false`   |

**Description:** Whether to use the vpc connector or direct connection to the vpc

#### <a name="oneOf_i0_cloud-run_startup-cpu-boost"></a>1.1.7. Property `CloudDeploy > oneOf > CloudRun > cloud-run > startup-cpu-boost`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `false`   |

**Description:** Whether to allocate extra CPU to containers on startup.

#### <a name="oneOf_i0_cloud-run_cpu-throttling"></a>1.1.8. Property `CloudDeploy > oneOf > CloudRun > cloud-run > cpu-throttling`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `true`    |

**Description:** Whether to throttle the CPU when the container is not actively serving requests.

#### <a name="oneOf_i0_cloud-run_session-affinity"></a>1.1.9. Property `CloudDeploy > oneOf > CloudRun > cloud-run > session-affinity`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `false`   |

**Description:** Whether to enable session affinity for connections to the service.

#### <a name="oneOf_i0_cloud-run_vpc-connector"></a>1.1.10. Property `CloudDeploy > oneOf > CloudRun > cloud-run > vpc-connector`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `true`    |

**Description:** Whether to use the vpc connector or direct connection to the vpc

#### <a name="oneOf_i0_cloud-run_internal-traffic"></a>1.1.11. Property `CloudDeploy > oneOf > CloudRun > cloud-run > internal-traffic`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |
| **Default**  | `true`    |

**Description:** Whether to setup internal traffic or not

#### <a name="oneOf_i0_cloud-run_monitoring"></a>1.1.12. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring`

**Title:** Monitoring

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | No                 |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/$defs/Monitoring |

| Property                                                   | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [prometheus](#oneOf_i0_cloud-run_monitoring_prometheus ) | No      | object | No         | -          | -                 |

##### <a name="oneOf_i0_cloud-run_monitoring_prometheus"></a>1.1.12.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus`

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

| Property                                                          | Pattern | Type    | Deprecated | Definition | Title/Description              |
| ----------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------ |
| + [interval](#oneOf_i0_cloud-run_monitoring_prometheus_interval ) | No      | integer | No         | -          | The scrape interval in seconds |
| - [path](#oneOf_i0_cloud-run_monitoring_prometheus_path )         | No      | string  | No         | -          | The scrape path                |
| - [port](#oneOf_i0_cloud-run_monitoring_prometheus_port )         | No      | integer | No         | -          | The scrape port                |

###### <a name="oneOf_i0_cloud-run_monitoring_prometheus_interval"></a>1.1.12.1.1. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > interval`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | Yes       |

**Description:** The scrape interval in seconds

| Restrictions |         |
| ------------ | ------- |
| **Minimum**  | &ge; 10 |

###### <a name="oneOf_i0_cloud-run_monitoring_prometheus_path"></a>1.1.12.1.2. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > path`

|              |              |
| ------------ | ------------ |
| **Type**     | `string`     |
| **Required** | No           |
| **Default**  | `"/metrics"` |

**Description:** The scrape path

###### <a name="oneOf_i0_cloud-run_monitoring_prometheus_port"></a>1.1.12.1.3. Property `CloudDeploy > oneOf > CloudRun > cloud-run > monitoring > prometheus > port`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | No        |
| **Default**  | `8080`    |

**Description:** The scrape port

## <a name="oneOf_i1"></a>2. Property `CloudDeploy > oneOf > Kubernetes`

**Title:** Kubernetes

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

| Property                              | Pattern | Type   | Deprecated | Definition            | Title/Description |
| ------------------------------------- | ------- | ------ | ---------- | --------------------- | ----------------- |
| + [kubernetes](#oneOf_i1_kubernetes ) | No      | object | No         | In #/$defs/Kubernetes | Kubernetes        |

### <a name="oneOf_i1_kubernetes"></a>2.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes`

**Title:** Kubernetes

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | Yes                |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/$defs/Kubernetes |

**Description:** A kubernetes service

| Property                                             | Pattern | Type             | Deprecated | Definition                                            | Title/Description   |
| ---------------------------------------------------- | ------- | ---------------- | ---------- | ----------------------------------------------------- | ------------------- |
| + [service](#oneOf_i1_kubernetes_service )           | No      | string           | No         | Same as [service](#oneOf_i0_cloud-run_service )       | ServiceName         |
| + [type](#oneOf_i1_kubernetes_type )                 | No      | enum (of string) | No         | -                                                     | The type of service |
| + [resources](#oneOf_i1_kubernetes_resources )       | No      | object           | No         | Same as [resources](#security_oneOf_i1_resources )    | Resources           |
| + [protocol](#oneOf_i1_kubernetes_protocol )         | No      | enum (of string) | No         | Same as [protocol](#oneOf_i0_cloud-run_protocol )     | Protocol            |
| - [timeout](#oneOf_i1_kubernetes_timeout )           | No      | integer          | No         | Same as [timeout](#oneOf_i0_cloud-run_timeout )       | RequestTimeout      |
| - [availability](#oneOf_i1_kubernetes_availability ) | No      | enum (of string) | No         | In #/$defs/Availability                               | Availability        |
| + [scaling](#oneOf_i1_kubernetes_scaling )           | No      | object           | No         | -                                                     | ScalingKubernetes   |
| - [volumes](#oneOf_i1_kubernetes_volumes )           | No      | array of object  | No         | -                                                     | Volumes             |
| - [monitoring](#oneOf_i1_kubernetes_monitoring )     | No      | object           | No         | Same as [monitoring](#oneOf_i0_cloud-run_monitoring ) | Monitoring          |

#### <a name="oneOf_i1_kubernetes_service"></a>2.1.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > service`

**Title:** ServiceName

|                        |                                        |
| ---------------------- | -------------------------------------- |
| **Type**               | `string`                               |
| **Required**           | Yes                                    |
| **Same definition as** | [service](#oneOf_i0_cloud-run_service) |

**Description:** Service name

#### <a name="oneOf_i1_kubernetes_type"></a>2.1.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > type`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | Yes                |

**Description:** The type of service

Must be one of:
* "Deployment"
* "StatefulSet"

#### <a name="oneOf_i1_kubernetes_resources"></a>2.1.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > resources`

**Title:** Resources

|                           |                                           |
| ------------------------- | ----------------------------------------- |
| **Type**                  | `object`                                  |
| **Required**              | Yes                                       |
| **Additional properties** | Any type allowed                          |
| **Same definition as**    | [resources](#security_oneOf_i1_resources) |

**Description:** The requested resources

#### <a name="oneOf_i1_kubernetes_protocol"></a>2.1.4. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > protocol`

**Title:** Protocol

|                        |                                          |
| ---------------------- | ---------------------------------------- |
| **Type**               | `enum (of string)`                       |
| **Required**           | Yes                                      |
| **Same definition as** | [protocol](#oneOf_i0_cloud-run_protocol) |

**Description:** The type of protocol. Make sure to set http2 if this service is using gRPC or WebSockets

#### <a name="oneOf_i1_kubernetes_timeout"></a>2.1.5. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > timeout`

**Title:** RequestTimeout

|                        |                                        |
| ---------------------- | -------------------------------------- |
| **Type**               | `integer`                              |
| **Required**           | No                                     |
| **Default**            | `300`                                  |
| **Same definition as** | [timeout](#oneOf_i0_cloud-run_timeout) |

**Description:** The request timeout in seconds

#### <a name="oneOf_i1_kubernetes_availability"></a>2.1.6. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > availability`

**Title:** Availability

|                |                      |
| -------------- | -------------------- |
| **Type**       | `enum (of string)`   |
| **Required**   | No                   |
| **Defined in** | #/$defs/Availability |

**Description:** Availability to configure priority on autoscaling

Must be one of:
* "low"
* "high"

#### <a name="oneOf_i1_kubernetes_scaling"></a>2.1.7. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling`

**Title:** ScalingKubernetes

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | Yes         |
| **Additional properties** | Not allowed |

**Description:** Scaling settings for Kubernetes

| Property                                             | Pattern | Type    | Deprecated | Definition | Title/Description                               |
| ---------------------------------------------------- | ------- | ------- | ---------- | ---------- | ----------------------------------------------- |
| + [cpu](#oneOf_i1_kubernetes_scaling_cpu )           | No      | integer | No         | -          | Average CPU percentage utilization for scaling. |
| - [vertical](#oneOf_i1_kubernetes_scaling_vertical ) | No      | object  | No         | -          | Config for vertical scaling                     |

##### <a name="oneOf_i1_kubernetes_scaling_cpu"></a>2.1.7.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > cpu`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | Yes       |

**Description:** Average CPU percentage utilization for scaling.

| Restrictions |          |
| ------------ | -------- |
| **Minimum**  | &ge; 0   |
| **Maximum**  | &le; 100 |

##### <a name="oneOf_i1_kubernetes_scaling_vertical"></a>2.1.7.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** Config for vertical scaling

| Property                                                                  | Pattern | Type    | Deprecated | Definition | Title/Description                                                 |
| ------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| - [threshold](#oneOf_i1_kubernetes_scaling_vertical_threshold )           | No      | integer | No         | -          | CPU percentage utilization for 1 pod to trigger vertical scaling. |
| - [increments-cpu](#oneOf_i1_kubernetes_scaling_vertical_increments-cpu ) | No      | number  | No         | -          | CPU request increase on scale out trigger                         |
| - [max-cpu](#oneOf_i1_kubernetes_scaling_vertical_max-cpu )               | No      | number  | No         | -          | Max CPU allowed on scale out                                      |
| - [max-memory](#oneOf_i1_kubernetes_scaling_vertical_max-memory )         | No      | string  | No         | -          | Max memory allowed on scale out in (Mi)                           |

###### <a name="oneOf_i1_kubernetes_scaling_vertical_threshold"></a>2.1.7.2.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > threshold`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | No        |

**Description:** CPU percentage utilization for 1 pod to trigger vertical scaling.

| Restrictions |          |
| ------------ | -------- |
| **Minimum**  | &ge; 10  |
| **Maximum**  | &le; 100 |

###### <a name="oneOf_i1_kubernetes_scaling_vertical_increments-cpu"></a>2.1.7.2.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > increments-cpu`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** CPU request increase on scale out trigger

| Restrictions |        |
| ------------ | ------ |
| **Minimum**  | N/A    |
| **Maximum**  | &le; 2 |

###### <a name="oneOf_i1_kubernetes_scaling_vertical_max-cpu"></a>2.1.7.2.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > max-cpu`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Max CPU allowed on scale out

| Restrictions |         |
| ------------ | ------- |
| **Minimum**  | N/A     |
| **Maximum**  | &le; 10 |

###### <a name="oneOf_i1_kubernetes_scaling_vertical_max-memory"></a>2.1.7.2.4. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > scaling > vertical > max-memory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Max memory allowed on scale out in (Mi)

| Restrictions                      |                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Must match regular expression** | ```^[0-9]+(M\|G)i``` [Test](https://regex101.com/?regex=%5E%5B0-9%5D%2B%28M%7CG%29i) |

#### <a name="oneOf_i1_kubernetes_volumes"></a>2.1.8. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes`

**Title:** Volumes

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | No                |

**Description:** Volumes to mount. Volumes are only supported with StatefulSet.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be              | Description    |
| -------------------------------------------- | -------------- |
| [Volume](#oneOf_i1_kubernetes_volumes_items) | A volume mount |

##### <a name="oneOf_i1_kubernetes_volumes_items"></a>2.1.8.1. CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume

**Title:** Volume

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** A volume mount

| Property                                                       | Pattern | Type             | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ----------------- |
| - [disk-type](#oneOf_i1_kubernetes_volumes_items_disk-type )   | No      | enum (of string) | No         | -          | The disk type     |
| + [size](#oneOf_i1_kubernetes_volumes_items_size )             | No      | string           | No         | -          | The disk size     |
| + [mount-path](#oneOf_i1_kubernetes_volumes_items_mount-path ) | No      | string           | No         | -          | The mount path    |

###### <a name="oneOf_i1_kubernetes_volumes_items_disk-type"></a>2.1.8.1.1. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > disk-type`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |
| **Default**  | `"hdd"`            |

**Description:** The disk type

Must be one of:
* "hdd"
* "ssd"

###### <a name="oneOf_i1_kubernetes_volumes_items_size"></a>2.1.8.1.2. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > size`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The disk size

| Restrictions                      |                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Must match regular expression** | ```^[0-9]+(M\|G)i``` [Test](https://regex101.com/?regex=%5E%5B0-9%5D%2B%28M%7CG%29i) |

###### <a name="oneOf_i1_kubernetes_volumes_items_mount-path"></a>2.1.8.1.3. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > volumes > Volume > mount-path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The mount path

#### <a name="oneOf_i1_kubernetes_monitoring"></a>2.1.9. Property `CloudDeploy > oneOf > Kubernetes > kubernetes > monitoring`

**Title:** Monitoring

|                           |                                              |
| ------------------------- | -------------------------------------------- |
| **Type**                  | `object`                                     |
| **Required**              | No                                           |
| **Additional properties** | Not allowed                                  |
| **Same definition as**    | [monitoring](#oneOf_i0_cloud-run_monitoring) |

## <a name="labels"></a>3. Property `CloudDeploy > labels`

**Title:** Labels

|                           |                |
| ------------------------- | -------------- |
| **Type**                  | `object`       |
| **Required**              | Yes            |
| **Additional properties** | Not allowed    |
| **Defined in**            | #/$defs/Labels |

| Property                                | Pattern | Type   | Deprecated | Definition                              | Title/Description |
| --------------------------------------- | ------- | ------ | ---------- | --------------------------------------- | ----------------- |
| + [component](#labels_component )       | No      | string | No         | In #/$defs/Label                        | Label             |
| + [product](#labels_product )           | No      | string | No         | Same as [component](#labels_component ) | Label             |
| - [iso-country](#labels_iso-country )   | No      | string | No         | In #/$defs/Label                        | Label             |
| - [tenant-alias](#labels_tenant-alias ) | No      | string | No         | In #/$defs/Label                        | Label             |
| - [^[a-z-]+$](#labels_pattern1 )        | Yes     | string | No         | Same as [component](#labels_component ) | Label             |

### <a name="labels_component"></a>3.1. Property `CloudDeploy > labels > component`

**Title:** Label

|                |               |
| -------------- | ------------- |
| **Type**       | `string`      |
| **Required**   | Yes           |
| **Defined in** | #/$defs/Label |

**Description:** A label value

| Restrictions                      |                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- |
| **Must match regular expression** | ```^[a-z-]+$``` [Test](https://regex101.com/?regex=%5E%5Ba-z-%5D%2B%24) |

### <a name="labels_product"></a>3.2. Property `CloudDeploy > labels > product`

**Title:** Label

|                        |                                |
| ---------------------- | ------------------------------ |
| **Type**               | `string`                       |
| **Required**           | Yes                            |
| **Same definition as** | [component](#labels_component) |

**Description:** A label value

### <a name="labels_iso-country"></a>3.3. Property `CloudDeploy > labels > iso-country`

**Title:** Label

|                |               |
| -------------- | ------------- |
| **Type**       | `string`      |
| **Required**   | No            |
| **Default**    | `"global"`    |
| **Defined in** | #/$defs/Label |

**Description:** A label value

| Restrictions                      |                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- |
| **Must match regular expression** | ```^[a-z-]+$``` [Test](https://regex101.com/?regex=%5E%5Ba-z-%5D%2B%24) |

### <a name="labels_tenant-alias"></a>3.4. Property `CloudDeploy > labels > tenant-alias`

**Title:** Label

|                |                  |
| -------------- | ---------------- |
| **Type**       | `string`         |
| **Required**   | No               |
| **Default**    | `"multi-tenant"` |
| **Defined in** | #/$defs/Label    |

**Description:** A label value

| Restrictions                      |                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- |
| **Must match regular expression** | ```^[a-z-]+$``` [Test](https://regex101.com/?regex=%5E%5Ba-z-%5D%2B%24) |

### <a name="labels_pattern1"></a>3.5. Pattern Property `CloudDeploy > labels > Label`
> All properties whose name matches the regular expression
```^[a-z-]+$``` ([Test](https://regex101.com/?regex=%5E%5Ba-z-%5D%2B%24))
must respect the following conditions

**Title:** Label

|                        |                                |
| ---------------------- | ------------------------------ |
| **Type**               | `string`                       |
| **Required**           | No                             |
| **Same definition as** | [component](#labels_component) |

**Description:** A label value

## <a name="security"></a>4. Property `CloudDeploy > security`

**Title:** Security

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `combining`      |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |
| **Defined in**            | #/$defs/Security |

| One of(Option)                           |
| ---------------------------------------- |
| [SecurityNone](#security_oneOf_i0)       |
| [IAMSettings](#security_oneOf_i1)        |
| [IAMBindingSettings](#security_oneOf_i2) |
| [CloudArmor](#security_oneOf_i3)         |

### <a name="security_oneOf_i0"></a>4.1. Property `CloudDeploy > security > oneOf > SecurityNone`

**Title:** SecurityNone

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Do not use platform security features

### <a name="security_oneOf_i1"></a>4.2. Property `CloudDeploy > security > oneOf > IAMSettings`

**Title:** IAMSettings

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** IAM Security settings

| Property                                                     | Pattern | Type             | Deprecated | Definition            | Title/Description                        |
| ------------------------------------------------------------ | ------- | ---------------- | ---------- | --------------------- | ---------------------------------------- |
| + [permission-prefix](#security_oneOf_i1_permission-prefix ) | No      | string           | No         | -                     | IAM permission prefix                    |
| - [auth-proxy](#security_oneOf_i1_auth-proxy )               | No      | enum (of string) | No         | -                     | Auth proxy to use                        |
| - [system-name](#security_oneOf_i1_system-name )             | No      | string           | No         | -                     | IAM system name defaults to service name |
| - [resources](#security_oneOf_i1_resources )                 | No      | object           | No         | In #/$defs/Resources  | Resources                                |
| - [cloud-armor](#security_oneOf_i1_cloud-armor )             | No      | object           | No         | In #/$defs/CloudArmor | CloudArmor                               |

#### <a name="security_oneOf_i1_permission-prefix"></a>4.2.1. Property `CloudDeploy > security > oneOf > IAMSettings > permission-prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** IAM permission prefix

| Restrictions                      |                                                                             |
| --------------------------------- | --------------------------------------------------------------------------- |
| **Must match regular expression** | ```^[a-z]{3}$``` [Test](https://regex101.com/?regex=%5E%5Ba-z%5D%7B3%7D%24) |

#### <a name="security_oneOf_i1_auth-proxy"></a>4.2.2. Property `CloudDeploy > security > oneOf > IAMSettings > auth-proxy`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |
| **Default**  | `"envoy-opa"`      |

**Description:** Auth proxy to use

Must be one of:
* "envoy-opa"
* "none"

#### <a name="security_oneOf_i1_system-name"></a>4.2.3. Property `CloudDeploy > security > oneOf > IAMSettings > system-name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** IAM system name defaults to service name

| Restrictions                      |                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------- |
| **Must match regular expression** | ```^[a-z0-9-]+$``` [Test](https://regex101.com/?regex=%5E%5Ba-z0-9-%5D%2B%24) |

#### <a name="security_oneOf_i1_resources"></a>4.2.4. Property `CloudDeploy > security > oneOf > IAMSettings > resources`

**Title:** Resources

|                           |                                   |
| ------------------------- | --------------------------------- |
| **Type**                  | `object`                          |
| **Required**              | No                                |
| **Additional properties** | Any type allowed                  |
| **Default**               | `{"cpu": 0.5, "memory": "512Mi"}` |
| **Defined in**            | #/$defs/Resources                 |

**Description:** The requested resources

| Property                                         | Pattern | Type   | Deprecated | Definition | Title/Description             |
| ------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------------------- |
| - [cpu](#security_oneOf_i1_resources_cpu )       | No      | number | No         | -          | Number of requested CPU cores |
| - [memory](#security_oneOf_i1_resources_memory ) | No      | string | No         | -          | Amount of memory to request   |

##### <a name="security_oneOf_i1_resources_cpu"></a>4.2.4.1. Property `CloudDeploy > security > oneOf > IAMSettings > resources > cpu`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Number of requested CPU cores

| Restrictions |        |
| ------------ | ------ |
| **Minimum**  | N/A    |
| **Maximum**  | &le; 8 |

##### <a name="security_oneOf_i1_resources_memory"></a>4.2.4.2. Property `CloudDeploy > security > oneOf > IAMSettings > resources > memory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Amount of memory to request

| Restrictions                      |                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| **Must match regular expression** | ```^[0-9]+(M\|G)i``` [Test](https://regex101.com/?regex=%5E%5B0-9%5D%2B%28M%7CG%29i) |

#### <a name="security_oneOf_i1_cloud-armor"></a>4.2.5. Property `CloudDeploy > security > oneOf > IAMSettings > cloud-armor`

**Title:** CloudArmor

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | No                 |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/$defs/CloudArmor |

**Description:** Use cloud armor policy

| Property                                                     | Pattern | Type   | Deprecated | Definition | Title/Description       |
| ------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------------- |
| + [policy-name](#security_oneOf_i1_cloud-armor_policy-name ) | No      | string | No         | -          | Cloud armor policy name |

##### <a name="security_oneOf_i1_cloud-armor_policy-name"></a>4.2.5.1. Property `CloudDeploy > security > oneOf > IAMSettings > cloud-armor > policy-name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Cloud armor policy name

### <a name="security_oneOf_i2"></a>4.3. Property `CloudDeploy > security > oneOf > IAMBindingSettings`

**Title:** IAMBindingSettings

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** IAM binding Security settings

| Property                                         | Pattern | Type   | Deprecated | Definition                                             | Title/Description     |
| ------------------------------------------------ | ------- | ------ | ---------- | ------------------------------------------------------ | --------------------- |
| - [cloud-armor](#security_oneOf_i2_cloud-armor ) | No      | object | No         | Same as [cloud-armor](#security_oneOf_i1_cloud-armor ) | CloudArmor            |
| + [consumers](#security_oneOf_i2_consumers )     | No      | object | No         | -                                                      | IAM service Consumers |

#### <a name="security_oneOf_i2_cloud-armor"></a>4.3.1. Property `CloudDeploy > security > oneOf > IAMBindingSettings > cloud-armor`

**Title:** CloudArmor

|                           |                                               |
| ------------------------- | --------------------------------------------- |
| **Type**                  | `object`                                      |
| **Required**              | No                                            |
| **Additional properties** | Not allowed                                   |
| **Same definition as**    | [cloud-armor](#security_oneOf_i1_cloud-armor) |

**Description:** Use cloud armor policy

#### <a name="security_oneOf_i2_consumers"></a>4.3.2. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers`

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | Yes         |
| **Additional properties** | Not allowed |

**Description:** IAM service Consumers

| Property                                                             | Pattern | Type            | Deprecated | Definition | Title/Description                    |
| -------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------ |
| + [service-accounts](#security_oneOf_i2_consumers_service-accounts ) | No      | array of string | No         | -          | IAM Service, user and group accounts |
| - [audiences](#security_oneOf_i2_consumers_audiences )               | No      | array of string | No         | -          | IAM service custom audiences allowed |

##### <a name="security_oneOf_i2_consumers_service-accounts"></a>4.3.2.1. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers > service-accounts`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** IAM Service, user and group accounts

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                        | Description                             |
| ---------------------------------------------------------------------- | --------------------------------------- |
| [ConsumerAccount](#security_oneOf_i2_consumers_service-accounts_items) | A google user, service or group account |

###### <a name="security_oneOf_i2_consumers_service-accounts_items"></a>4.3.2.1.1. CloudDeploy > security > oneOf > IAMBindingSettings > consumers > service-accounts > ConsumerAccount

**Title:** ConsumerAccount

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A google user, service or group account

##### <a name="security_oneOf_i2_consumers_audiences"></a>4.3.2.2. Property `CloudDeploy > security > oneOf > IAMBindingSettings > consumers > audiences`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** IAM service custom audiences allowed

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                  | Description                             |
| ---------------------------------------------------------------- | --------------------------------------- |
| [ConsumerAudience](#security_oneOf_i2_consumers_audiences_items) | An audience allowed through the service |

###### <a name="security_oneOf_i2_consumers_audiences_items"></a>4.3.2.2.1. CloudDeploy > security > oneOf > IAMBindingSettings > consumers > audiences > ConsumerAudience

**Title:** ConsumerAudience

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** An audience allowed through the service

### <a name="security_oneOf_i3"></a>4.4. Property `CloudDeploy > security > oneOf > CloudArmor`

**Title:** CloudArmor

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** Use cloud armor policy

| Property                                         | Pattern | Type   | Deprecated | Definition                                             | Title/Description |
| ------------------------------------------------ | ------- | ------ | ---------- | ------------------------------------------------------ | ----------------- |
| + [cloud-armor](#security_oneOf_i3_cloud-armor ) | No      | object | No         | Same as [cloud-armor](#security_oneOf_i1_cloud-armor ) | CloudArmor        |

#### <a name="security_oneOf_i3_cloud-armor"></a>4.4.1. Property `CloudDeploy > security > oneOf > CloudArmor > cloud-armor`

**Title:** CloudArmor

|                           |                                               |
| ------------------------- | --------------------------------------------- |
| **Type**                  | `object`                                      |
| **Required**              | Yes                                           |
| **Additional properties** | Not allowed                                   |
| **Same definition as**    | [cloud-armor](#security_oneOf_i1_cloud-armor) |

**Description:** Use cloud armor policy

## <a name="environments"></a>5. Property `CloudDeploy > environments`

**Title:** Environments

|                           |                      |
| ------------------------- | -------------------- |
| **Type**                  | `object`             |
| **Required**              | Yes                  |
| **Additional properties** | Not allowed          |
| **Defined in**            | #/$defs/Environments |

**Description:** Deploy environments

| Property                                  | Pattern | Type        | Deprecated | Definition             | Title/Description   |
| ----------------------------------------- | ------- | ----------- | ---------- | ---------------------- | ------------------- |
| - [production](#environments_production ) | No      | object      | No         | In #/$defs/Environment | Environment         |
| - [staging](#environments_staging )       | No      | Combination | No         | -                      | Staging environment |

### <a name="environments_production"></a>5.1. Property `CloudDeploy > environments > production`

**Title:** Environment

|                           |                     |
| ------------------------- | ------------------- |
| **Type**                  | `object`            |
| **Required**              | No                  |
| **Additional properties** | Not allowed         |
| **Defined in**            | #/$defs/Environment |

**Description:** Production environment

| Property                                                       | Pattern | Type            | Deprecated | Definition | Title/Description           |
| -------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | --------------------------- |
| + [min-instances](#environments_production_min-instances )     | No      | integer         | No         | -          | Minimum number of instances |
| - [max-instances](#environments_production_max-instances )     | No      | integer         | No         | -          | Maximum number of instances |
| - [domain-mappings](#environments_production_domain-mappings ) | No      | array of string | No         | -          | DomainMappings              |
| - [path-mappings](#environments_production_path-mappings )     | No      | array of object | No         | -          | PathMappings                |
| - [env](#environments_production_env )                         | No      | object          | No         | -          | EnvVars                     |
| - [regions](#environments_production_regions )                 | No      | array of string | No         | -          | Regions                     |

#### <a name="environments_production_min-instances"></a>5.1.1. Property `CloudDeploy > environments > production > min-instances`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | Yes       |

**Description:** Minimum number of instances

| Restrictions |           |
| ------------ | --------- |
| **Minimum**  | &ge; 0    |
| **Maximum**  | &le; 1000 |

#### <a name="environments_production_max-instances"></a>5.1.2. Property `CloudDeploy > environments > production > max-instances`

|              |           |
| ------------ | --------- |
| **Type**     | `integer` |
| **Required** | No        |
| **Default**  | `100`     |

**Description:** Maximum number of instances

| Restrictions |           |
| ------------ | --------- |
| **Minimum**  | &ge; 0    |
| **Maximum**  | &le; 1000 |

#### <a name="environments_production_domain-mappings"></a>5.1.3. Property `CloudDeploy > environments > production > domain-mappings`

**Title:** DomainMappings

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Service domain mappings

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                          | Description                 |
| -------------------------------------------------------- | --------------------------- |
| [Domain](#environments_production_domain-mappings_items) | Fully qualified domain name |

##### <a name="environments_production_domain-mappings_items"></a>5.1.3.1. CloudDeploy > environments > production > domain-mappings > Domain

**Title:** Domain

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Fully qualified domain name

#### <a name="environments_production_path-mappings"></a>5.1.4. Property `CloudDeploy > environments > production > path-mappings`

**Title:** PathMappings

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | No                |

**Description:** Service path mappings

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                          | Description |
| -------------------------------------------------------- | ----------- |
| [PathRule](#environments_production_path-mappings_items) | PathRules   |

##### <a name="environments_production_path-mappings_items"></a>5.1.4.1. CloudDeploy > environments > production > path-mappings > PathRule

**Title:** PathRule

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** PathRules

| Property                                                                     | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [oneOf](#environments_production_path-mappings_items_oneOf )               | No      | object          | No         | -          | -                 |
| - [paths](#environments_production_path-mappings_items_paths )               | No      | array of string | No         | -          | Paths             |
| - [path-rewrite](#environments_production_path-mappings_items_path-rewrite ) | No      | string          | No         | -          | Path rewrite      |

###### <a name="environments_production_path-mappings_items_oneOf"></a>5.1.4.1.1. Property `CloudDeploy > environments > production > path-mappings > PathRule > oneOf`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="environments_production_path-mappings_items_paths"></a>5.1.4.1.2. Property `CloudDeploy > environments > production > path-mappings > PathRule > paths`

**Title:** Paths

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Target paths

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                  | Description          |
| ---------------------------------------------------------------- | -------------------- |
| [path](#environments_production_path-mappings_items_paths_items) | Fully qualified path |

###### <a name="environments_production_path-mappings_items_paths_items"></a>5.1.4.1.2.1. CloudDeploy > environments > production > path-mappings > PathRule > paths > path

**Title:** path

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Fully qualified path

| Restrictions                      |                                                                       |
| --------------------------------- | --------------------------------------------------------------------- |
| **Must match regular expression** | ```^/(.*)$``` [Test](https://regex101.com/?regex=%5E%2F%28.%2A%29%24) |

###### <a name="environments_production_path-mappings_items_path-rewrite"></a>5.1.4.1.3. Property `CloudDeploy > environments > production > path-mappings > PathRule > path-rewrite`

**Title:** Path rewrite

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The path prefix that will be used on the target service

#### <a name="environments_production_env"></a>5.1.5. Property `CloudDeploy > environments > production > env`

**Title:** EnvVars

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

**Description:** Environment variables and secrets

| Property                                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [^[A-Z0-9_]+$](#environments_production_env_pattern1 ) | Yes     | string | No         | -          | EnvVar            |

##### <a name="environments_production_env_pattern1"></a>5.1.5.1. Pattern Property `CloudDeploy > environments > production > env > EnvVar`
> All properties whose name matches the regular expression
```^[A-Z0-9_]+$``` ([Test](https://regex101.com/?regex=%5E%5BA-Z0-9_%5D%2B%24))
must respect the following conditions

**Title:** EnvVar

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="environments_production_regions"></a>5.1.6. Property `CloudDeploy > environments > production > regions`

**Title:** Regions

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of regions in case of multi-regional deploy

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                        | Description                              |
| ------------------------------------------------------ | ---------------------------------------- |
| [GoogleRegion](#environments_production_regions_items) | A Google Cloud region, e.g. europe-west1 |

##### <a name="environments_production_regions_items"></a>5.1.6.1. CloudDeploy > environments > production > regions > GoogleRegion

**Title:** GoogleRegion

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A Google Cloud region, e.g. europe-west1

### <a name="environments_staging"></a>5.2. Property `CloudDeploy > environments > staging`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `combining`      |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** Staging environment

| One of(Option)                                |
| --------------------------------------------- |
| [StagingNone](#environments_staging_oneOf_i0) |
| [Environment](#environments_staging_oneOf_i1) |

#### <a name="environments_staging_oneOf_i0"></a>5.2.1. Property `CloudDeploy > environments > staging > oneOf > StagingNone`

**Title:** StagingNone

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Do not use a staging environment

#### <a name="environments_staging_oneOf_i1"></a>5.2.2. Property `CloudDeploy > environments > staging > oneOf > Environment`

**Title:** Environment

|                           |                                        |
| ------------------------- | -------------------------------------- |
| **Type**                  | `object`                               |
| **Required**              | No                                     |
| **Additional properties** | Not allowed                            |
| **Same definition as**    | [production](#environments_production) |

**Description:** A deploy environment

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2025-02-28 at 12:51:58 +0100
