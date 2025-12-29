title = "Weather Data Aggregator"
template = "render_hub_content_body"
date = "2025-12-29T00:00:00Z"
content-type = "text/plain"
tags = ["rust", "leptos", "website", "api", "iot"]

[extra]
author = "gergelyk"
type = "hub_document"
category = "Sample"
language = "Rust"
created_at = "2025-12-29T00:00:00Z"
last_updated = "2025-12-29T00:00:00Z"
spin_version = ">=v3.4.1"
summary = "Agregates current weather data from multiple sources."
url = "https://weather.fermyon.app/"
repo_url = "https://github.com/gergelyk/weather-data-aggregator"
image = "https://raw.githubusercontent.com/gergelyk/weather-data-aggregator/5fe92f4c86e7ecd1d1aef764bac3ac6c3b9ce7ce/docs/screenshot.png"
keywords = "Rust, Leptos, Website, API, IoT"

---

Agregates data from meteo stations. Full stack app. Provides web UI and public API.

API is source of the data for this IoT project: [retro-clock](https://github.com/gergelyk/retro-clock)

![](https://raw.githubusercontent.com/gergelyk/weather-data-aggregator/5fe92f4c86e7ecd1d1aef764bac3ac6c3b9ce7ce/docs/screenshot.png)

Application is available at: https://weather.fermyon.app/

**Features:**
- Configuration stored in the cookies.
- Customizable rows and columns.
- Integration with [lesma](https://lesma.eu/), for editing/sharing configuration.

**Supported providers:**
- https://www.aemet.es
- https://www.meteo.cat
- https://www.meteoclimatic.net
- https://www.weatherlink.com
- https://www.openwindmap.org

## Setup

1. Install spin framework as described on the [webpage](https://spinframework.dev/)
2. Make sure that wasm32 targets are added to the toolchain
  ```sh
  cd ui
  rustup show # check which toolchain is active
  # for the active toolchain (1.86.0):
  rustup +1.86.0 target add wasm32-unknown-unknown // used for frontend compilation
  rustup +1.86.0 target add wasm32-wasip1          // used for backend compilation
  ```

## Development

```sh
export SPIN_VARIABLE_KV_EXPLORER_USER=demo
export SPIN_VARIABLE_KV_EXPLORER_PASSWORD=demo
export SPIN_VARIABLE_API_TOKEN=demo
spin up --build --runtime-config-file runtime_config.toml
curl -X POST -d @api/examples/mixed.json 'http://127.0.0.1:3000/api/v1?token=demo'
```

Notes:
- Use `spin watch` to rebuild & run the app on changes.
- Temporarily comment out line with `data-wasm-opt="z"` in `index.html`
  and section `[profile.release]` in Cargo.toml for faster development cycle.

## Deployment

```sh
export SPIN_VARIABLE_API_TOKEN=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
spin deploy --build \
--variable api_token=$E:SPIN_VARIABLE_API_TOKEN \
--variable kv_explorer_user=$E:SPIN_VARIABLE_KV_EXPLORER_USER \
--variable kv_explorer_password=$E:SPIN_VARIABLE_KV_EXPLORER_PASSWORD
curl -X POST -d @api/examples/mixed.json 'https://weather.fermyon.app/api/v1?token='$SPIN_VARIABLE_API_TOKEN
```
