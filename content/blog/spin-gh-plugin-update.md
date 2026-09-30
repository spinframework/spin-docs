title = "Even Better GitHub Actions For Your Spin Apps"
date = "2026-09-30T13:00:00Z"
template = "blog_post"
description = "The gh plugin for Spin CLI just got a lot better. Publish your Spin Apps as OCI artifacts, sign them keyless with cosign, and generate and scan SBOMs - all from a single command."
tags = ["GitHub Actions", "DevEx"]

[extra]
type = "post"
author = "Thorsten Hans"
canonical_url = "https://www.thorsten-hans.com/even-better-github-actions-for-spin-apps/"

---

The `gh` plugin for Spin CLI is around for quite some time now and I hope it served you well so far. In this short post, I'll guide you through the most recent changes I added to `spin gh create-action`. 

## Installing The Latest Version of the `gh` Plugin

Obviously, you must have the Spin CLI and the latest version of the `gh` plugin installed on your system. Although, it not being a strict requirement, I highly encourage you to install the latest stable release of Spin (`4.1.0` at the time of writing this post).

To upgrade (or install) the latest version of the `gh` plugin for Spin, you can use the following commands:

```bash
# Update the plugin index
spin plugins update

# Upgrade (or Install) the gh plugin
spin plugins upgrade gh --yes

# Check installed version of Spin plugins
# For gh this should report 0.2.1
spin plugins list --installed
gh 0.2.1 [installed]
```

---

## Scaffolding 2 Demo Apps

I prefer explaining things in the context of a simple example, which usually ends up being way more approachable for everyone. That said, let's quickly scaffold two Spin applications that we'll use for illustration purpose:

```bash
# Create a new top-level-folder
mkdir the-new-spin-gh
cd the-new-spin-gh

# Scaffolding the 1st Spin app
spin new -t http-rust -a app-one --no-vcs

# Scaffolding the 2nd Spin app
spin new -t http-ts -a app-two --no-vcs
```

As this post is about the **GitHub Actions** plugin for Spin, let's create a new repository (usually, I prefix these kind of repositories with `tmp--` or `delete-me--`). If you code along, you can obviously choose a more realistic and meaningful name:

```bash
# Init the Git repository
git init

# Create a new GitHub repository
gh repo create tmp--the-new-spin-gh \
  -d "Exploring latest features of spin gh" \
  --public \
  --source .
```

Let's `add`, `commit`, and `push` our two sample applications:

```bash
# Create a simple README
echo '# Exploring latest features of spin gh' >> README.md

## Use git to do git things
git add .
git commit -sm 'chore: Add two sample applications'
git push -u origin main
```

## The Basics

Nothing new here! I just wanna ensure everybody is able to follow the upcoming sections in which we check out the new features.

You can use the `spin gh create-action` command to generate a new GitHub Action workflow file. The command has a massive amount of flags allowing you to customize almost everything from events that should trigger your workflow, over tool versions all the way down to Spin plugins that must be installed on the runner.

The `spin gh eject` command renders the template used by `spin gh create-action`. You can customize it and pass it using the `--template` argument, which will make the `spin gh create-action` command use your customized template.

For reference, this is what the plugin generates for our two demo apps when we don't opt in to any of the new features:

```bash
spin gh create-action
```

```yaml
name: "CI"
on:
  push:
    branches:
      - "main"
env:
  RUST_VERSION: "1.98.1"
  RUST_TARGET: "wasm32-wasip2"
  NODE_VERSION: "26"
jobs:
  spin:
    runs-on: "ubuntu-latest"
    name: Build Spin App
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: "${{ env.RUST_VERSION }}"
          targets: "${{ env.RUST_TARGET }}"
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "${{ env.NODE_VERSION }}"
      - name: Install Spin
        uses: fermyon/actions/spin/setup@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
      - name: Build app-one
        run: spin build
        working-directory: ./app-one
      - name: Build app-two
        run: spin build
        working-directory: ./app-two
```

The plugin recursively examined the working directory, figured out which toolchains it needs (Rust and Node.js in our case), and wired up a `spin build` for each app. Neat, but building is only half the story.

## Publishing Spin Apps as OCI Artifacts

The first new feature is the `--push-oci-artifacts` flag. It adds all the steps necessary to publish your Spin App(s) to an OCI registry as part of your workflow:

```bash
spin gh create-action --push-oci-artifacts --overwrite
```

In contrast to most other flags, `--push-oci-artifacts` can't figure out everything on its own. Where should your apps be published to? Which tag(s) do you want to use? Does the registry require authentication? Those are decisions only you can make. That's why the plugin presents an **interactive TUI** and walks you through the configuration - one app at a time. Here's what you'll be asked for **every** discovered Spin App:

- **Artifact name** - The full repository path of your artifact, *without* a tag (for example `ghcr.io/thorstenhans/tmp-app-one`). This one is required.
- **Tags** - Which tag(s) should be published on every run? You can pick from `latest`, the commit SHA (one immutable tag per commit), both, or provide your own custom tag(s). If you go for custom tags, the plugin asks for a comma-separated list next (for example `v1.0.0, staging`).
- **Authentication** - Does the target registry require authentication? If you say yes, the plugin asks for the **login server** and the **username** to use. It won't ask for the corresponding password or token, instead it will inject a GitHub repository secret.

There's one convenient shortcut baked in: whenever your artifact name points at **GitHub Container Registry** (prefixed with `ghcr.io`), the plugin detects it automatically and authenticates using the built-in `GITHUB_TOKEN`. No extra questions, no extra secrets. That's exactly the path I picked for both demo apps.

With those answers in place, the plugin adds a `packages: write` permission and appends the publish steps for both apps:

```yaml
name: "CI"
# ...
jobs:
  spin:
    # ...
    permissions:
      contents: read
      packages: write
    steps:
      # ...
      - name: Authenticate against OCI registry for app-one
        run: |
          spin registry login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
      - name: Push OCI Artifact for app-one
        working-directory: ./app-one
        run: |
          spin registry push ghcr.io/thorstenhans/tmp-app-one:latest
      - name: Authenticate against OCI registry for app-two
        run: |
          spin registry login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
      - name: Push OCI Artifact for app-two
        working-directory: ./app-two
        run: |
          spin registry push ghcr.io/thorstenhans/tmp-app-two:latest
```

That's it - every push to `main` now builds *and* publishes both apps to GitHub Container Registry.

## Keyless Signing OCI Artifacts with `cosign`

Publishing artifacts is great, but how do your consumers know an artifact really came from your pipeline and wasn't tampered with? That's what the `--sign` flag is for. It uses [cosign](https://github.com/sigstore/cosign) to **keyless sign** your OCI artifacts, leveraging the OIDC identity of your GitHub Action - no long-lived signing keys to manage or leak.

```bash
spin gh create-action --push-oci-artifacts --sign --overwrite
```

Note that `--sign` builds on top of OCI publishing. If you forget `--push-oci-artifacts`, the plugin will terminate and yell at you.

The interactive TUI is exactly the same as before. On top of the publish steps, the plugin now grants the workflow the `id-token: write` permission (required for keyless signing), installs `cosign`, authenticates against the OCI compliant registry additionally using `docker`, and adds a signing step per artifact:

```yaml

name: "CI"
# ...
jobs:
  spin:
    # ...
    permissions:
      contents: read
      packages: write
      id-token: write
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
        # ...
      - name: Authenticate against OCI registry for app-one
        run: |
          spin registry login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
          docker login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
      - name: Push OCI Artifact for app-one
        # ...
      - name: Sign OCI Artifact for app-one
        working-directory: ./app-one
        run: |
          cosign sign --yes ghcr.io/thorstenhans/tmp-app-one:latest
      - name: Authenticate against OCI registry for app-two
        run: |
          spin registry login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
          docker login -u ${{ github.actor }} -p ${{ secrets.GITHUB_TOKEN }} ghcr.io
      - name: Push OCI Artifact for app-two
        # ...
      - name: Sign OCI Artifact for app-two
        working-directory: ./app-two
        run: |
          cosign sign --yes ghcr.io/thorstenhans/tmp-app-two:latest

```

## SBOM Generation and Vulnerability Scanning with `trivy` and `oras`

The last new feature is the `--sbom` flag. It brings a complete software supply chain story to your workflow. It generates a **Software Bill of Materials** (SBOM), scans it for critical vulnerabilities, and attaches the SBOM right next to your OCI artifact so consumers can inspect it later.

For achieving this, two new tools will be added to the GitHub Action workflow file: [trivy](https://github.com/aquasecurity/trivy) generates the SBOM (in SPDX JSON format) and scans it, and [oras](https://oras.land/) attaches the SBOM to the published artifact. 

Just like `--sign`, the `--sbom` flag requires `--push-oci-artifacts`.

```bash
spin gh create-action --push-oci-artifacts --sign --sbom --overwrite
```

Again, the interactive UI is unchanged. Under the hood, the plugin installs bespoke tools, generates and scans the SBOM *before* pushing, and attaches it *after*:

```yaml
name: "CI"
# ...
jobs:
  spin:
    # ...
    steps:
      - name: Install trivy
        uses: aquasecurity/setup-trivy@e07451d2e059ed86c2870430ea286b3a9e0bf241
      - name: Install ORAS
        uses: oras-project/setup-oras@v1
        # ...
      - name: Generate SBOM for app-one
        working-directory: ./app-one
        run: |
          trivy fs --format spdx-json -o sbom.spdx.json .
      - name: Scan app-one SBOM for Critical Vulnerabilities
        working-directory: ./app-one
        run: |
          trivy sbom --exit-code 1 --severity HIGH,CRITICAL sbom.spdx.json
      - name: Authenticate against OCI registry for app-one
        # ...
      - name: Push OCI Artifact for app-one
        # ...
      - name: Sign OCI Artifact for app-one
        # ...
      - name: Attach app-one SBOM via ORAS
        working-directory: ./app-one
        run: |
          oras attach --artifact-type application/spdx+json ghcr.io/thorstenhans/tmp-app-one:latest sbom.spdx.json

      - name: Generate SBOM for app-two
        working-directory: ./app-two
        run: |
          trivy fs --format spdx-json -o sbom.spdx.json .
      - name: Scan app-two SBOM for Critical Vulnerabilities
        working-directory: ./app-two
        run: |
          trivy sbom --exit-code 1 --severity HIGH,CRITICAL sbom.spdx.json
      - name: Authenticate against OCI registry for app-two
        # ...
      - name: Push OCI Artifact for app-two
        #...
      - name: Sign OCI Artifact for app-two
        # ...
      - name: Attach app-two SBOM via ORAS
        working-directory: ./app-two
        run: |
          oras attach --artifact-type application/spdx+json ghcr.io/thorstenhans/tmp-app-two:latest sbom.spdx.json
```

Notice the vulnerability scan uses `--exit-code 1 --severity HIGH,CRITICAL`. In other words: if `trivy` finds a `HIGH` or `CRITICAL` vulnerability, the workflow **fails** and nothing gets published. Exactly what you want as a safety net.

## Conclusion

With `--push-oci-artifacts`, `--sign`, and `--sbom`, the `gh` plugin for Spin CLI now covers the full journey from source code to a published, signed, and documented OCI artifact - without you having to hand-craft a single line of YAML. The interactive UI keeps the publishing configuration approachable, while the generated workflow follows supply chain best practices out of the box.

Happy shipping!
