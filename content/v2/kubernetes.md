title = "Spin on Kubernetes"
template = "main"
date = "2024-03-07T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/spin/v2/kubernetes.md"

---

## Why Use Spin With Kubernetes? 

In addition to `spin up` Fermyon also offers Fermyon Cloud to deploy spin apps into production, so why use Spin with Kubernetes? For users that have made existing investments into Kubernetes or have requirements that their applications stay within certain clouds, not be on shared infrastructure, or run on-premise, Kubernetes provides a robust solution.

There are a few options for running Spin on Kubernetes: 

*  **[SpinKube](https://spinkube.dev)** is an open source project that provides the best Kubernetes-native experience for running Spin applications on Kubernetes. From runtime installation via `runtime-class-manager` to resource management via Spin Operator, SpinKube provides you with a complete toolkit for running spin applications on Kubernetes as a custom resource (known as SpinApps). For guidance on how to get started with SpinKube, please visit the [SpinKube documentation](https://spinkube.dev). 

  >> If you've been following Fermyon for a while, you may have tried our [legacy Spin integration with Kubernetes](spin-in-pods-legacy), where you bundled Spin applications as OCI containers and ran them in a pod. While a convenient set up for testing, this format introduces limitations such as the need to keep a long running container. For the best experience, we recommend you migrate to [SpinKube](https://spinkube.dev)

* **Fermyon Platform for Kubernetes** is a managed distribution of SpinKube, currently in private beta, that can be run on your existing Kubernetes infrastructure for enhanced performance and density for your SpinApps. If this is of interest to your team, please [schedule a demo](https://www.fermyon.com/demo).
