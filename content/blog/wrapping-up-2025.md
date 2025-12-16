title = "Wrapping Up 2025"
date = "2025-12-16T17:45:05.449167Z"
template = "blog_post"
description = "That's all folks! Until next year."
tags = []

[extra]
type = "post"
author = "The Spin Project"

---

## A Year of Momentum

This past year marked an important inflection point for Spin, both for the project and for the commnunity building and consuming it.

Spin began the year by entering the Cloud Native Computing Foundation (CNCF) as a Sandbox project. That milestone reflected the growing confidence in the project's direction and governance, and it was made possible by the sustained efforts of the maintainers and contributors who helped bring Spin to this stage.

The year closed with the release of the first WASIp3 release candidate. This was a significant technical milestone that required substantial efforts across the broader ecosystem, the Spin runtime, and associated SDKs. Delivering WASIp3 support was the result of months of focused non-trivial work and close collaboration between the Spin maintainers and developers of the Bytecode Alliance projects.

Between those two bookends, Spin continued to evolve in steady but meaningful ways. The project saw a consistent stream of features, refinements, and quality-of-life improvements across the runtime, triggers, SDKs, and tooling. Many of these changes were incremental in isolation, but together they materially improved how it feels to build, run, and operate Spin applications.

Just as importantly, the project welcomed new contributors over the course of the year. First-time contributors helped shape and deliver features, improve documentation, test early changes, and surface issues before they reached users. Our growing community of contributors has become an essential part to Spin's evolution.

## Looking Ahead

With a more mature codebase, a growing community of contributors, and a WASIp3 release candidate now available, the Spin project will enter the new year focused on building on the foundations already in place.

The months ahead will continue on the path towards WASIp3 stabilization. While the release candidate is a major milestone, feedback from real-world usage, API refinement, and improved migration paths will shape what comes next, in close alignment with upstream WASI developement.

Spin will continue to heavily invest in developer experience and operational polish, with incremental improvements to tooling and workflows that make new capabilities easier to adopt without compromising stability. The following is a brief overview of what we are aiming for!

### WASIp3 Final

The next WASIp3 release is expected to represent the final step in the Preview 3 track, with momentum increasingly shifting toward the broader WASI 1.0 effort. As that work converges, WASIp3 will move from active iteration toward consolidation and long-term support.

As WASIp3 stabilizes upstream, Spin plans to remove the current gating around WASIp3 in the executor and SDKs, reflecting its transition from experimental support to a stable, supported part of the platform.

### Instance Reuse

WASIp3 introduces an execution model where components can handle asynchronous work and make progress on multiple requests within a single instance. This shifts execution away from strictly one-shot invocations toward longer-lived, reusable components.

Spin is aligning with this model by moving toward instance reuse as the default for WASIp3 components, enabling higher throughput and more efficient use of resources. Earlier WASI models were not designed with these assumptions and continue to be handled more conservatively.

Instance reuse is intended to come with sensible defaults while remaining configurable, allowing operators to tune behavior or opt out as needed based on workload and performance characteristics.

The [instance reuse](https://github.com/spinframework/spin/pull/3328) feature is slated for our next release but currently available in canary!

### Target Worlds

Spin applications can already rely on features that exist only in particular environments such as custom triggers or host capabilities like local service chaining. Today, however, Spin has no way to declare an application's intended deployment environment or to validate compatibility ahead of time, which means these compatibility issues may only surface at runtime. [Target worlds and environments](https://github.com/spinframework/spin/pull/2806) are designed to make those expectations explicit and check them at build time.

### Middleware

WASIp3 promises composable HTTP, freed from the incoming/outgoing asymmetry of WASIp2. This simplifies building middleware components: that is, components that sit in an HTTP pipeline, validating and/or enriching requests and responses as they enter and leave the core application. Authentication and authorization are the classic examples, but there are many others such as CORS. We’re hoping in 2026 to support declarative HTTP middleware, so that developers can express the HTTP pipeline in the manifest using custom or off-the-shelf components.

### Dependencies

A little over a year ago, we shipped support for [component dependencies](https://github.com/spinframework/spin/pull/2543), which we rolled out in Spin v3.0. This feature cemented a foundation for developers to define how their dependencies are wired up allowing for a true polyglot experience. In the new year, we will focus on improving the developer experience for working with dependencies, striving for a native experience that most developers are familiar with. We did some initial experiments on this in the [`spin deps` plugin](https://github.com/spinframework/spin-deps-plugin), and in 2026 we plan to iterate and improve on this experience as well as integrating it into the Spin command line. In addition to making it easier to consume dependencies, we are looking to enable a workflow to facilitate their development.

## Stay In Touch

The Spin project is entering the new year with solid momentum and clear priorities. The focus ahead is steady progress, turning the advances made in the past year into well-understood building blocks for Spin applications. We are excited to meet you there!

Please join us for weekly [project meetings](https://github.com/spinframework/spin#getting-involved-and-contributing), chat in the [Spin CNCF Slack channel](https://cloud-native.slack.com/archives/C089NJ9G1V0) and follow on X (formerly Twitter) [@spinframework](https://twitter.com/spinframework)!

To get started with Spin and explore the latest features, follow the [Spin quickstart](https://spinframework.dev/v3/quickstart) which provides step-by-step instructions for installing Spin, creating your first application, and running it locally. Also head over to the [Spin Hub](https://spinframework.dev/hub) for inspiration on what you can build!