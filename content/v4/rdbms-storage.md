title = "Relational Database Storage"
template = "main"
date = "2023-11-04T00:00:01Z"
enable_shortcodes = true
[extra]
url = "https://github.com/spinframework/spin-docs/blob/main/content/v4/rdbms-storage.md"

---
- [Using MySQL and PostgreSQL From Applications](#using-mysql-and-postgresql-from-applications)
- [Application Development Considerations](#application-development-considerations)
	- [PostgreSQL Range Queries](#postgresql-range-queries)
- [Granting Network Permissions to Components](#granting-network-permissions-to-components)
	- [Configuration-Based Permissions](#configuration-based-permissions)

Spin provides two interfaces for relational (SQL) databases:

* A built-in [SQLite Database](./sqlite-api-guide), which is always available and requires no management on your part.
* "Bring your own database" support for MySQL and PostgreSQL, where you host and manage the database outside of Spin.

This page covers the "bring your own database" scenario.  See [SQLite Storage](./sqlite-api-guide) for the built-in service.

{{ details "Why do I need a Spin interface? Why can't I just use my language's database libraries?" "The current version of the WebAssembly System Interface (WASI) doesn't provide a sockets interface, so database libraries that depend on sockets can't be built to Wasm. The Spin interface means Wasm modules can bypass this limitation by asking Spin to make the database connection on their behalf." }}

## Using MySQL and PostgreSQL From Applications

The Spin SDK surfaces the Spin MySQL and PostgreSQL interfaces to your language. The set of operations is the same across both databases:

| Operation  | Parameters                 | Returns             | Behavior |
|------------|----------------------------|---------------------|----------|
| `open`     | address                    | connection resource | Opens a connection to the specified database. The host must be listed in `allowed_outbound_hosts`. Other operations must be called through a connection. |
| `query`    | statement, SQL parameters  | database records    | Runs the specified statement against the database, returning the query results as a set of rows. |
| `execute`  | statement, SQL parameters  | integer (not MySQL) | Runs the specified statement against the database, returning the number of rows modified by the statement.  (MySQL does not return the modified row count.) |

> The PostgreSQL interface is asynchronous (a blocking one is available for backward compatibility); the MySQL interface is blocking.

The exact detail of calling these operations from your application depends on your language:

{{ tabs "sdk-type" }}

{{ startTab "Rust"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://docs.rs/spin-sdk/latest/spin_sdk/index.html)

MySQL functions are available in the `spin_sdk::mysql` module, and PostgreSQL functions in the `spin_sdk::pg` module.

The function names match the operations above. This example shows MySQL (blocking):

```rust
use spin_sdk::mysql::{self, Connection, Decode, ParameterValue};

let connection = Connection::open(&address)?;

let params = vec![ParameterValue::Int32(id)];

let rowset = connection.query("SELECT id, name FROM pets WHERE id = ?", &params)?;

// MySQL returns the rows as a vector
match rowset.rows.first() {
    None => /* no rows matched query */,
    Some(row) => {
        let name = String::decode(&row[1])?;
    }
}
```

PostgreSQL (async) uses a `QueryResult` struct to encapsulate the streaming results:

```rust
use spin_sdk::pg::{Connection, Decode, ParameterValue};

let connection = Connection::open(&address).await?;

let mut query_result = connection.query(
    "SELECT id, name FROM pets WHERE id = $1",
    &[ParameterValue::Int32(id)]
).await?;

// PostgreSQL returns the rows asynchronously (stream-like)
while let Some(row) = query_result.next().await {
    let name = row.get::<String>("name")?;
    // ... more processing ...
}

// Check if the row stream ended due to completion or an error
query_result.result().await?;
```

> If you are querying for a small result set, you can load all the rows into a `Vec` by calling `QueryResult::collect()`. This can be more convenient for some operations.

**Notes**

* Parameters are instances of the `ParameterValue` enum; you must wrap raw values in this type.
* A row is a vector of the `DbValue` enum. Use the `Decode` trait to access conversions to common types.
* Modified row counts are returned as `u64`.
* All functions wrap the return in `anyhow::Result`.

You can find complete examples for using relational databases in the Spin repository on GitHub ([MySQL](https://github.com/spinframework/spin-rust-sdk/tree/main/examples/mysql), [PostgreSQL](https://github.com/spinframework/spin-rust-sdk/tree/main/examples/postgres)).

For full information about the MySQL and PostgreSQL APIs, see [the Spin SDK reference documentation](https://docs.rs/spin-sdk/latest/spin_sdk/index.html).

{{ blockEnd }}

{{ startTab "TypeScript"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-js-sdk/)

The code below is an [Outbound MySQL example](https://github.com/spinframework/spin-js-sdk/tree/main/examples/spin-host-apis/spin-mysql). There is also an outbound [PostgreSQL example](https://github.com/spinframework/spin-js-sdk/tree/main/examples/spin-host-apis/spin-postgres) available.

```ts
// https://itty.dev/itty-router/routers/autorouter
import { AutoRouter } from 'itty-router';
import { open } from '@spinframework/spin-mysql';

// Connects as the root user without a password 
const DB_URL = "mysql://root:@127.0.0.1/spin_dev"

/*
 Run the following commands to setup the instance:
 create database spin_dev;
 use spin_dev;
 create table test(id int, val int);
 insert into test values (4,4);
*/

let router = AutoRouter();

router
    .get("/", () => {
        let conn = open(DB_URL);
        conn.execute('delete from test where id=?', [4]);
        conn.execute('insert into test values (4,5)', []);
        let ret = conn.query('select * from test', []);

        return new Response(JSON.stringify(ret, null, 2));
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});
```

{{ blockEnd }}

{{ startTab "Python"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://spinframework.github.io/spin-python-sdk/v4/)

The code below shows use of the [Postgres](https://spinframework.github.io/spin-python-sdk/v4/postgres.html) module and its [open](https://spinframework.github.io/spin-python-sdk/v4/postgres.html#spin_sdk.postgres.open) function for opening a connection to the database:

```python
from spin_sdk import http, util
from spin_sdk.http import Request, Response
from spin_sdk.postgres import Connection

class HttpHandler(http.Handler):
    async def handle_request(self, request: Request) -> Response:
        with await Connection.open("user=postgres dbname=spin_dev host=localhost sslmode=disable password=password") as db:
            columns, stream, future = await db.query("SELECT * FROM test", [])
            rows = await util.collect((stream, future))

        return Response(
            200,
            {"content-type": "text/plain"},
            bytes(str(rows), "utf-8")
        )
```

**General Notes**
* The `query` method returns a Tuple containing a list of `columns`, a list of `rows` encapsulated via a [StreamReader](https://github.com/bytecodealliance/componentize-py/blob/1b3d2e936868307a48fb70941dcad71b54e844f8/bundled/componentize_py_async_support/streams.py#L101), and a [FutureReader](https://github.com/bytecodealliance/componentize-py/blob/1b3d2e936868307a48fb70941dcad71b54e844f8/bundled/componentize_py_async_support/futures.py#L11). You _must_ check when the stream ends, to determine if the stream ended normally, or was terminated prematurely due to an error.

    > As seen in the example above, you can utilize the [collect](https://spinframework.github.io/spin-python-sdk/v4/util.html#spin_sdk.util.collect) method from the `util` package to handle the `StreamReader` and `FutureReader` pair, aggregating the resulting rows into memory.

* The `Connection` object doesn't surface the `close` function.
* Errors are surfaced as exceptions.

You can find a complete outbound PostgreSQL example in the [Spin Python SDK repository on GitHub](https://github.com/spinframework/spin-python-sdk/tree/main/examples/spin-postgres). There is also an [Outbound MySQL example](https://github.com/spinframework/spin-python-sdk/tree/main/examples/spin-mysql) available.

{{ blockEnd }}

{{ startTab "Go"}}

> [**Want to go straight to the reference documentation?**  Find it here.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v3)

MySQL functions are available in the `github.com/spinframework/spin-go-sdk/v3/mysql` package, and PostgreSQL in `github.com/spinframework/spin-go-sdk/v3/pg`. [See Go Packages for reference documentation.](https://pkg.go.dev/github.com/spinframework/spin-go-sdk/v3)

The package follows the usual Go database API. Use `Open` to return a connection to the database of type `*sql.DB` - see the [Go standard library documentation](https://pkg.go.dev/database/sql#DB) for usage information.  For example:

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	spinhttp "github.com/spinframework/spin-go-sdk/v3/http"
	"github.com/spinframework/spin-go-sdk/v3/pg"
)

type Pet struct {
	ID        int64
	Name      string
	Prey      *string // nullable field must be a pointer
	IsFinicky bool
}

func init() {
	spinhttp.Handle(func(w http.ResponseWriter, r *http.Request) {

		// addr is the environment variable set in `spin.toml` that points to the
		// address of the Mysql server.
		addr := os.Getenv("DB_URL")

		// For MySQL, use `mysql.Open`
		db := pg.Open(addr)
		defer db.Close()

		// For MySQL, use `?` placeholder syntax
		_, err := db.Query("INSERT INTO pets VALUES ($1, 'Maya', $2, $3);", int32(4), "bananas", true)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		rows, err := db.Query("SELECT * FROM pets")
		defer rows.Close()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var pets []*Pet
		for rows.Next() {
			var pet Pet
			if err := rows.Scan(&pet.ID, &pet.Name, &pet.Prey, &pet.IsFinicky); err != nil {
				fmt.Println(err)
			}
			pets = append(pets, &pet)
		}
		if err := rows.Err(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(pets)
	})
}
```

{{ blockEnd }}

{{ blockEnd }}

## Application Development Considerations

This section contains notes and gotchas for developers using Spin's relational database APIs.

### PostgreSQL Range Queries

The PostgreSQL "range contains" operator, `<@`, is overloaded for "contains value" and "contains another range." This ambiguity can result in "wrong type" errors when executing "range contains" queries where the left hand side is parameterised.

To avoid this, use a type annotation on the parameter placeholder, e.g.:

```
SELECT name FROM cats WHERE $1::int4 <@ reign
```

The ambiguity is tracked at https://github.com/sfackler/rust-postgres/issues/1258.

## Granting Network Permissions to Components

By default, Spin components are not allowed to make outgoing network requests, including MySQL or PostgreSQL. This follows the general Wasm rule that modules must be explicitly granted capabilities, which is important to sandboxing. To grant a component permission to make network requests to a particular host, use the `allowed_outbound_hosts` field in the component manifest, specifying the host and allowed port:

```toml
[component.uses-db]
allowed_outbound_hosts = ["postgres://postgres.example.com:5432"]
```

### Configuration-Based Permissions

You can use [application variables](./variables.md#adding-variables-to-your-applications) in the `allowed_outbound_hosts` field.
