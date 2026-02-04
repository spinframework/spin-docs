title = "API Support Overview"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v3/api-guides-overview.md"

---
- [Targeting a Deployment Environment](#targeting-a-deployment-environment)

The following table shows the status of the interfaces Spin provides to applications.

| Host Capabilities/Interfaces                 | Stability    |
|----------------------------------------------|--------------|
| [HTTP Trigger](./http-trigger)               | Stable       |
| [Redis Trigger](./redis-trigger)             | Stable       |
| [Cron Trigger](./triggers)               | Experimental |
| [Outbound HTTP](./http-outbound)             | Stable       |
| [Outbound Redis](./redis-outbound)           | Stable       |
| [Configuration Variables](./variables)       | Stable       |
| [PostgreSQL](./rdbms-storage)                | Experimental |
| [MySQL](./rdbms-storage)                     | Experimental |
| [Key-value Storage](./kv-store-api-guide)    | Stabilizing  |
| [Serverless AI](./serverless-ai-api-guide)   | Experimental |
| [SQLite Storage](./sqlite-api-guide)         | Experimental |
| [MQTT Messaging](./mqtt-outbound)             | Experimental |

For more information about what is possible in the programming language of your choice, please see our [Language Support Overview](./language-support-overview).

## Targeting a Deployment Environment

Some Spin runtimes may support a different set of APIs from those listed above, or may support only older versions. For example, some runtimes might not support SQLite, or Serverless AI; or the Spin 3.2 runtime does not support the most recent PostgreSQL API introduced in Spin 3.4. This is an important consideration when writing a Spin application that will run in a different environment from your development environment: you do not want to depend on SQLite if you will have to deploy to an environment without it.

You can tell the Spin CLI about the environment (or environments) that you plan to deploy into using the `application.targets` field in `spin.toml`. If you do this, `spin build` verifies the set of APIs used by your components against each listed environment. If a component uses APIs that wouldn't be supported, `spin build` will warn you.

For example, here is how to specify that you want your application to be compatible with `spin up` version 3.2:

```toml
# spin.toml

[application]
targets = ["spin-up:3.2"]
```

For the other runtime environments such as SpinKube or commercial clouds, see the documentation for those projects for their environment IDs.
