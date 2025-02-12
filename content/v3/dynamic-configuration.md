title = "Dynamic and Runtime Application Configuration"
template = "main"
date = "2023-11-04T00:00:01Z"
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/spin/v3/dynamic-configuration.md"

---

- [Application Variables Runtime Configuration](#application-variables-runtime-configuration)
  - [Environment Variable Provider](#environment-variable-provider)
  - [Vault Application Variable Provider](#vault-application-variable-provider)
    - [Vault Application Variable Provider Example](#vault-application-variable-provider-example)
  - [Azure Key Vault Application Variable Provider](#azure-key-vault-application-variable-provider)
    - [Azure Key Vault Application Variable Provider Example](#azure-key-vault-application-variable-provider-example)
- [Key Value Store Runtime Configuration](#key-value-store-runtime-configuration)
  - [File Key Value Store Provider](#file-key-value-store-provider)
  - [Redis Key Value Store Provider](#redis-key-value-store-provider)
  - [Azure CosmosDB Key Value Store Provider](#azure-cosmosdb-key-value-store-provider)
  - [AWS DynamoDB Key Value Store Provider](#aws-dynamodb-key-value-store-provider)
  - [Multiple and Non-Default Key-Value Stores](#multiple-and-non-default-key-value-stores)
- [SQLite Storage Runtime Configuration](#sqlite-storage-runtime-configuration)
  - [LibSQL Storage Provider](#libsql-storage-provider)
- [LLM Runtime Configuration](#llm-runtime-configuration)
  - [Remote Compute Provider](#remote-compute-provider)

Configuration for Spin application features such as [application variables](./variables),
[key value storage](./kv-store-api-guide), [SQL storage](./sqlite-api-guide)
and [Serverless AI](./serverless-ai-api-guide) can be supplied dynamically, i.e. during the application runtime,
requiring no changes to the application code itself.

This runtime configuration data is stored in the `runtime-config.toml` file and passed in via the `--runtime-config-file` flag
when invoking the `spin up` command.

Let's look at each configuration category in-depth below.

## Application Variables Runtime Configuration

[Application Variables](./variables) values may be set at runtime by providers. Currently,
there are three application variable providers: the [environment-variable provider](#environment-variable-provider), 
the [Vault provider](#vault-application-variable-provider) and the [Azure Key Vault provider](#azure-key-vault-application-variable-provider).

Multiple application variable providers can be configured in Spin. Providers are
prioritized top-down in the runtime configuration file, with higher-listed providers
taking precedence. The environment variable provider always has the highest
priority.

The provider examples below show how to use or configure each 
provider. For examples on how to access these variables values within your application, see
[Using Variables from Applications](./variables#using-variables-from-applications).

### Environment Variable Provider

The environment variable provider gets variable values from the `spin` process's
environment (_not_ the component `environment`). Variable keys are translated
to environment variables by upper-casing and prepending with `SPIN_VARIABLE_`:

<!-- @selectiveCpy -->

```bash
$ export SPIN_VARIABLE_API_KEY="1234"  # Sets the `api_key` value.
$ spin up
```

### Vault Application Variable Provider

The Vault application variable provider gets secret values from [HashiCorp Vault](https://www.vaultproject.io/).
Currently, only the [KV Secrets Engine - Version 2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) is supported.
You can set up the v2 kv secret engine at any mount point and provide Vault information in
the [runtime configuration](#runtime-configuration) file:

<!-- @nocpy -->

```toml
[[config_provider]]
type = "vault"
url = "http://127.0.0.1:8200"
token = "root"
mount = "secret"
```

#### Vault Application Variable Provider Example

1. [Install Vault](https://developer.hashicorp.com/vault/tutorials/getting-started/getting-started-install).
2. Start Vault:

<!-- @selectiveCpy -->

```bash
$ vault server -dev -dev-root-token-id root
```

3. Set a password:

<!-- @selectiveCpy -->

```bash
$ export VAULT_TOKEN=root
$ export VAULT_ADDR=http://127.0.0.1:8200
$ vault kv put secret/secret value="test_password"
$ vault kv get secret/secret
```

4. Go to the [Vault variable provider example](https://github.com/fermyon/enterprise-architectures-and-patterns/tree/main/application-variable-providers/vault-provider) application.
5. Build and run the `vault-provider` app:

<!-- @selectiveCpy -->

```bash
$ spin build
$ spin up --runtime-config-file runtime-config.toml
```

6. Test the app:

<!-- @selectiveCpy -->

```bash
$ curl localhost:3000 --data "test_password"
{"authentication": "accepted"}
```
<!-- @selectiveCpy -->

```bash
$ curl localhost:3000 --data "wrong_password"
{"authentication": "denied"}
```

### Azure Key Vault Application Variable Provider

The Azure Key Vault application variable provider gets secret values from [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault).

Currently, only receiving the latest version of a secret is supported.

For authenticating against Azure Key Vault, you must use the client credentials flow. To do so, create a Service Principal (SP) within your Microsoft Entra ID (previously known as Azure Active Directory) and assign the `Key Vault Secrets User` role to the SP on the scope of your Azure Key Vault instance.

You can set up Azure Key Vault application variable provider in
the [runtime configuration](#runtime-configuration) file:

<!-- @nocpy -->

```toml
[[config_provider]]
type = "azure_key_vault"
vault_url = "https://spin.vault.azure.net/"
client_id = "12345678-1234-1234-1234-123456789012"
client_secret = "some.generated.password"
tenant_id = "12345678-1234-1234-1234-123456789012"
authority_host = "AzurePublicCloud"
```

#### Azure Key Vault Application Variable Provider Example

1. Deploy Azure Key Vault:

<!-- @selectiveCpy -->

```bash
# Variable Definition
$ KV_NAME=spin123
$ LOCATION=germanywestcentral
$ RG_NAME=rg-spin-azure-key-vault

# Create an Azure Resource Group and an Azure Key Vault
$ az group create -n $RG_NAME -l $LOCATION
$ az keyvault create -n $KV_NAME \
  -g $RG_NAME \
  -l $LOCATION \
  --enable-rbac-authorization true

# Grab the Azure Resource Identifier of the Azure Key Vault instance
$ KV_SCOPE=$(az keyvault show -n $KV_NAME -g $RG_NAME -otsv --query "id")
```

2. Add a Secret to the Azure Key Vault instance:

<!-- @selectiveCpy -->

```bash
# Grab the ID of the currently signed in user in Azure CLI
$ CURRENT_USER_ID=$(az ad signed-in-user show -otsv --query "id")

# Make the currently signed in user a "Key Vault Secrets Officer"
# on the scope of the new Azure Key Vault instance
$ az role assignment create --assignee $CURRENT_USER_ID \
  --role "Key Vault Secrets Officer" \
  --scope $KV_SCOPE

# Create a test secret called `secret` in the Azure Key Vault instance
$ az keyvault secret set -n secret --vault-name $KV_NAME --value secret_value --onone
```

3. Create a Service Principal and Role Assignment for Spin:

<!-- @selectiveCpy -->

```bash
$ export SP_NAME=sp-spin

# Create the SP
$ SP=$(az ad sp create-for-rbac -n $SP_NAME -ojson)

# Populate local shell variables from the SP JSON
$ CLIENT_ID=$(echo $SP | jq -r '.appId')
$ CLIENT_SECRET=$(echo $SP | jq -r '.password')
$ TENANT_ID=$(echo $SP | jq -r '.tenant')

# Assign the "Key Vault Secrets User" role to the SP
# allowing it to read secrets from the Azure Key Vault instance
$ az role assignment create --assignee $CLIENT_ID \
  --role "Key Vault Secrets User" \
  --scope $KV_SCOPE
```

4. Go to the [Azure Key Vault variable provider example](https://github.com/fermyon/enterprise-architectures-and-patterns/tree/main/application-variable-providers/azure-key-vault-provider) application.
5. Replace Tokens in `runtime-config.toml`.

The `azure-key-vault-provider` application contains a `runtime-config.toml` file. Replace all tokens (e.g. `$KV_NAME$`) with the corresponding shell variables you created in the previous steps.   

6. Build and run the `azure-key-vault-provider` app:

<!-- @selectiveCpy -->

```bash
$ spin build
$ spin up --runtime-config-file runtime-config.toml
```

7. Test the app:

<!-- @selectiveCpy -->

```bash
$ curl localhost:3000
Loaded Secret from Azure Key Vault: secret_value
```

## Key Value Store Runtime Configuration

Spin provides built-in key-value storage. By default, this storage is backed by a file in the application `.spin` directory. However, the Spin runtime configuration file (`runtime-config.toml`) can be updated to not only modify the file configuration but also choose to use a different backing store. The available store options are the file provider, an external Redis database, Azure CosmosDB or AWS DynamoDB.

### File Key Value Store Provider

To use a file as a backend for Spin's key-value store, set the type to `spin`, and provide a file path:

```toml
[key_value_store.default]
type = "spin"
path = ".spin/precious-data.db"
```

Spin creates the path and file if they don't already exist.

> If, during development, you need to examine keys and values, you can open the file using `sqlite3` or another SQLite tools. However, the file format is subject to change, and you should not rely on it.

### Redis Key Value Store Provider

To use a Redis store as a backend for Spin's key-value store, set the type to `redis` and provide the URL of the Redis host:

```toml
[key_value_store.default]
type = "redis"
url = "redis://localhost"
```

### Azure CosmosDB Key Value Store Provider

To use an Azure CosmosDB database as a backend for Spin's key-value store, set the type to `azure_cosmos` and specify your database account details:

```toml
[key_value_store.default]
type = "azure_cosmos"
key = "<key>"
account = "<cosmos-account>"
database = "<cosmos-database>"
container = "<cosmos-container>"
```

> Note: The CosmosDB container must be created with the default partition key, `/id`.

### AWS DynamoDB Key Value Store Provider

To use an Amazon Web Services DynamoDB database as a backend for Spin's key-value store, set the type to `aws_dynamo` and specify your database account details:

```toml
[key_value_store.default]
type = "aws_dynamo"
region = "<aws-region>"   # e.g. "us-east-1"
table = "<dynamo-table>"  # e.g. "spin-key-values"
consistent_read = true    # optional, to use strongly consistent reads
```

You may optionally provide `access_key` and `secret_key` credentials; otherwise, Spin picks these up from your [AWS environment variables](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html). For short-lived credentials, you can additionally provide `token` (from the [Get Session Token API](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html) or [`aws sts get-session-token` CLI command](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sts/get-session-token.html)).

By default, the DynamoDB backend uses eventually consistent reads. The `consistent_read` option turns on [strongly consistent reads](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html). This ensures reads are up-to-date with writes, at an increased cost. See the [DynamoDB documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) for more information.

> Note: The DynamoDB table must be created with the partition key `PK`. It must have no sort key (so that the partition key is the primary key).

### Multiple and Non-Default Key-Value Stores

Whilst a single default store may be sufficient for certain application use cases, each Spin application can be configured to support multiple stores of any `type`, as shown in the `runtime-config.toml` file below:

```toml
# This defines a new store named user_data
[key_value_store.user_data]
type = "spin" 
path = ".spin/user_data.db"

# This defines a new store named other_data backed by a Redis database
[key_value_store.other_data]
type = "redis"
url = "redis://localhost"
```

You must individually grant each component access to the stores that it needs to use. To do this, use the `component.key_value_stores` entry in the component manifest within `spin.toml`. See [Spin Key Value Store](kv-store-api-guide.md) for more details. 

## SQLite Storage Runtime Configuration

Spin provides built-in SQLite storage. By default, this is backed by a database that Spin creates for you underneath your application directory (in the `.spin` subdirectory). However, you can use the Spin runtime configuration file (`runtime-config.toml`) to add and customize SQLite databases.

The following example `runtime-config.toml` tells Spin to map the `default` database to an SQLite database elsewhere in the file system:

```toml
[sqlite_database.default]
type = "spin"
path = "/planning/todo.db"
```

If you need more than one database, you can configure multiple databases, each with its own name:

```toml
# This defines a new store named todo
[sqlite_database.todo]
type = "spin"
path = "/planning/todo.db"

# This defines a new store named finance
[sqlite_database.finance]
type = "spin"
path = "/super/secret/monies.db"
```

Spin creates any database files that don't exist.  However, it is up to you to delete them when you no longer need them.

### LibSQL Storage Provider

Spin can also use [libSQL](https://libsql.org/) databases accessed over HTTPS.  libSQL is fully compatible with SQLite but provides additional features including remote, distributed databases.

> Spin does not provide libSQL access to file-based databases, only databases served over HTTPS. Specifically, Spin supports [the `sqld` libSQL server](https://github.com/libsql/sqld).

To use libSQL, set `type = "libsql"` in your `runtime-config.toml` entry.  You must then provide a `url` and authentication `token` instead of a file path.  For example, this entry tells Spin to map the `default` database to a libSQL service running on `libsql.example.com`:

```toml
# This tells Spin to use the remote host as its default database
[sqlite_database.default]
type = "libsql"
url = "https://sensational-penguin-ahacker.libsql.example.com"
token = "a secret"
```

Spin does _not_ create libSQL databases.  Use your hosting service's tools to create them (or `sqld` if you are self-hosting) .  You can still set up tables and data in a libSQL database via `spin up --sqlite`.

> You must include the scheme in the `url` field. The scheme must be `http` or `https`. Non-HTTP libSQL protocols are not supported.

The `default` database will still be defined, even if you add other databases.

By default, components will not have access to any of these databases (even the default one). You must grant each component access to the databases that it needs to use. To do this, use the `component.sqlite_databases` entry in the component manifest within `spin.toml`. See [SQLite Database](./sqlite-api-guide.md) for more details. 

## LLM Runtime Configuration

Spin provides a Large Language Model interface for interacting with LLMs for inferencing and embedding. The default host implementation is to use local CPU/GPU compute. However, the Spin runtime configuration file (`runtime-config.toml`) can be updated to enable Spin to use remote compute using HTTP requests.

### Remote Compute Provider

The following is an example of how an application's `runtime-config.toml` file can be configured to use the remote compute option. Note the `type`, `url` and `auth_token` are set to `remote_http`, URL of the server and the auth token for the server. 

```toml
[llm_compute]
type = "remote_http"
url = "http://example.com"
auth_token = "<auth_token>"
```

Currently, the remote compute option requires an user to deploy their own LLM proxy service. Fermyon Cloud users can do this using the [`cloud-gpu` plugin](https://github.com/spinframework/spin-cloud-gpu).  If you prefer to create and deploy your own proxy service, you can find a reference implementation of the proxy protocol in the [`spin-cloud-gpu plugin repository`](https://github.com/spinframework/spin-cloud-gpu/blob/main/fermyon-cloud-gpu/src/index.ts). 

By default, components will not have access to the LLM models unless granted explicit access through the `component.ai_models` entry in the component manifest within `spin.toml`. See [Serverless AI](./serverless-ai-api-guide) for more details.
