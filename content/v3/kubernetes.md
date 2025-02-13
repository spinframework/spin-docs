title = "Spin on Kubernetes"
template = "main"
date = "2024-03-07T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/spin/v3/kubernetes.md"

---

## Why Use Spin With Kubernetes? 

In addition to `spin up` Fermyon also offers Fermyon Cloud to deploy spin apps into production, so why use Spin with Kubernetes? For users that have made existing investments into Kubernetes or have requirements that their applications stay within certain clouds, not be on shared infrastructure, or run on-premise, Kubernetes provides a robust solution.

There are a few options for running Spin on Kubernetes: 

*  **[SpinKube](https://spinkube.dev)** is an open source project that provides the best Kubernetes-native experience for running Spin applications on Kubernetes. From runtime installation via `runtime-class-manager` to resource management via Spin Operator, SpinKube provides you with a complete toolkit for running spin applications on Kubernetes as a custom resource (known as SpinApps). For guidance on how to get started with SpinKube, please visit the [SpinKube documentation](https://spinkube.dev). 

* **Fermyon Platform for Kubernetes** is a managed distribution of SpinKube, currently in private beta, that can be run on your existing Kubernetes infrastructure for enhanced performance and density for your SpinApps. If this is of interest to your team, please [schedule a demo](https://www.fermyon.com/demo).
