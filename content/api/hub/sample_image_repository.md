title = "Transforming image repository"
template = "render_hub_content_body"
date = "2025-07-03T14:30:00Z"
content-type = "text/plain"
tags = ["rust", "go", "typescript", "python", "http", "sqlite", "cron"]

[extra]
author = "Mayflower GmbH"
type = "hub_document"
category = "Sample"
language = "Polyglot"
created_at = "2025-07-03T14:30:00Z"
last_updated = "2025-07-03T14:30:00Z"
spin_version = ">=v3.2.0"
summary =  "A transforming image repository composed of multiple components in different languages."
url = "https://github.com/mayflower/spin-workshop-2025"
keywords = "Rust, Go, TypeScript, Python, HTTP, SQLte, cron"

---

This is a transforming image repository. Originals are uploaded as either
PNG or JPEG and then are transformed to a different size and format on-the-fly
during download. Transformed images are cached with a configurable TTL and
finally discarded by a cron component.

The app is composed of multiple components in different languages that communicate
via HTTP. It was developed as part of a workshop on Spin, so the
repository also contains extensive documentation and a Dockerfile (with a 
prebuild image on the hub) that packages all prerequisites to build, run and
develop the app.