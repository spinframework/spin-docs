title = "API Support Overview"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/api-guides-overview.md"

---
- [Asynchronous and Blocking APIs](#asynchronous-and-blocking-apis)
- [Targeting a Deployment Environment](#targeting-a-deployment-environment)

The following table shows the status of the interfaces Spin provides to applications.

| Host Capabilities/Interfaces                 | Stability    | Async? (see NOTE)   |
|----------------------------------------------|--------------|---------------------|
| [HTTP Trigger](./http-trigger)               | Stable       | Async entry point   |
| [Redis Trigger](./redis-trigger)             | Stable       | Async entry point   |
| [Cron Trigger](./triggers)                   | Experimental | Sync entry point    |
| [Outbound HTTP](./http-outbound)             | Stable       | Async               |
| [Outbound Redis](./redis-outbound)           | Stable       | Async               |
| [Configuration Variables](./variables)       | Stable       | Async               |
| [PostgreSQL](./rdbms-storage)                | Stable       | Async               |
| [MySQL](./rdbms-storage)                     | Experimental | Blocking            |
| [Key-value Storage](./kv-store-api-guide)    | Stable       | Async               |
| [Serverless AI](./serverless-ai-api-guide)   | Experimental | Blocking            |
| [SQLite Storage](./sqlite-api-guide)         | Stable       | Async               |
| [MQTT Messaging](./mqtt-outbound)            | Experimental | Async               |

NOTE: Blocking versions of async APIs and entry points are still available for backward compatibility.

For more information about what is possible in the programming language of your choice, please see our [Language Support Overview](./language-support-overview).

## Asynchronous and Blocking APIs

In Spin 3.x, all APIs and entry points were blocking. These blocking APIs and entry points are still supported in Spin 4.x, but Spin 4.x also supports asynchronous versions of most of them.

Generally, you can mix async and blocking APIs as necessary. There are one important restriction: a sync entry point _must not_ call an async API. If you are using a sync trigger (as shown above), you _must_ call _only_ blocking APIs. Depending on your language and Spin SDK version, blocking APIs may be available in your SDK, or you may need to switch to an older SDK.

Older builds of trigger plugins may be sync even if marked async above. Check the plugin documentation, and make sure you are running an up-to-date version, if you want to use async APIs.

## Targeting a Deployment Environment

Some Spin runtimes may support a different set of APIs from those listed above, or may support only older versions. For example, some runtimes might not support SQLite, or Serverless AI; or Spin 3.x-based runtimes don't support the async API versions introduced in Spin 4.0. This is an important consideration when writing a Spin application that will run in a different environment from your development environment: you do not want to depend on SQLite if you will have to deploy to an environment without it.

You can tell the Spin CLI about the environment (or environments) that you plan to deploy into using the `application.targets` field in `spin.toml`. If you do this, `spin build` verifies the set of APIs used by your components against each listed environment. If a component uses APIs that wouldn't be supported, `spin build` will warn you.

For example, here is how to specify that you want your application to be compatible with `spin up` version 3.2:

```toml
# spin.toml

[application]
targets = ["spin-up:3.2"]
```

For the other runtime environments such as SpinKube or commercial clouds, see the documentation for those projects for their environment IDs.
