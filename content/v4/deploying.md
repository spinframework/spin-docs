title = "Deployment Options"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/deploying.md"

---

This page covers known deployment options for Spin applications. [Please help keep this page up to date if we've missed one.](./contributing-docs.md)

## Spin command line

You can run the Spin CLI on a server just as you do on your development workstation. See the [Running Applications guide](/running-apps) for more details.

> The command line provides no recovery or failover features. This may be fine for non-essential or private projects, but for anything that needs higher reliability, you'll need to add other components to provide that.

## Kubernetes

You can deploy Spin applications to a Kubernetes cluster with [SpinKube](https://www.spinkube.dev/docs/overview/) - an open source project that streamlines the experience of developing, deploying, and operating Wasm workloads on Kubernetes. Like Spin, SpinKube is a CNCF Sandbox project.

## Microsoft Azure Kubernetes Service

[The community `spin azure` plugin](https://github.com/Mossaka/spin-plugin-azure) streamlines deploying SpinKube and Spin applications to an AKS cluster.  It provides for creating SpinKube clusters, setting up workload identity, CosmosDB integration, and application deployment.

**To install the plugin:** `spin plugins install azure`

**To create a SpinKube cluster:** `spin azure cluster create`

**To deploy an application:** [see the workflow here](https://github.com/Mossaka/spin-plugin-azure?tab=readme-ov-file#workflow-explanation)

## Fermyon Cloud

[Fermyon Cloud](https://developer.fermyon.com/cloud) is a self-service application platform for WebAssembly-based serverless functions and microservices. It enables you to run Spin applications, at scale, in the cloud, without any infrastructure setup or maintenance required.

**To install the plugin:** `spin plugins install cloud`

**To deploy an application:** `spin cloud deploy`

## Fermyon Wasm Functions

[Fermyon Wasm Functions](https://developer.fermyon.com/wasm-functions) is an edge environment hosted in the Akamai Cloud. It enables you to run Spin applications with global distribution.

**To install the plugin:** `spin plugins install aka`

**To deploy an application:** `spin aka deploy`
