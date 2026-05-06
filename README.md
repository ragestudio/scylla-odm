# @ragestudio/scylla-odm

> A lightweight ODM for ScyllaDB and Cassandra.

> **Warning:** under active development, not production-ready.

---

## why this exists

Most of (not existent) Node.js ODMs for ScyllaDB/Cassandra rely on the official `cassandra-driver`.

The official `cassandra-driver` ships a built-in mapper, but it has no
TypeScript support or a friendly interface.
You define your columns with plain strings and get
plain objects back — no autocomplete, no type checking, no safety net.

This ODM is built on top of a modified `cassandra-driver` and adds:

- **Type-safe schemas** — your column types are inferred, so `find`,
  `create`, and `save` all know the shape of your data
- **ODM Methods** — easier & friendly API for interacting with your data
- **Full TypeScript support** — autocomplete, type checking, and inference
  from schema to model to document
- **MongoDB-style query operators** — `$gt`, `$in`, `$lte`, etc., all typed

We also stripped out everything you probably never use (DataStax Insights,
metrics, heavy dependencies, and other services) and applied a bunch of performance patches on
top of the driver itself.

The result is a leaner driver with less overhead, fewer timers, and better
memory usage.

---

## install

```bash
npm install @ragestudio/scylla-odm
```

---

## quick start

```ts
import Client, { Schema, Model, ColumnTypes } from "@ragestudio/scylla-odm";
import type { Column } from "@ragestudio/scylla-odm/types";

// 1. define a schema
const userSchema = new Schema(
  {
    table_name: "users",
    keys: ["id"], // partition key and clustering keys
  },
  {
    id: { type: ColumnTypes.Int, required: true } as Column<number>,
    name: { type: ColumnTypes.Text, required: true } as Column<string>,
    email: { type: ColumnTypes.Text, required: true } as Column<string>,
    age: { type: ColumnTypes.Int } as Column<number>,
  },
);

// 2. create a model
const User = new Model("User", userSchema);

// 3. create a client
const client = new Client({
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
  keyspace: "myapp",
});

// 4. initialize and connect
await client.initialize();

// 4. create and save documents
const user = User.create({
  id: 1234,
  name: "Alice",
  email: "alice@example.com",
  age: 30,
});

await user.save();

// 5. query
const found = await User.findOne({ id: 1234 });
console.log(found?.name); // "Alice"

// 6. shutdown
await client.shutdown();
```

---

## schema

A schema describes a table: its name, primary keys, and columns.

```ts
const productSchema = new Schema(
  {
    table_name: "products",
    keys: [["category"], "id"], // compound partition key
    clustering_order: { created_at: "desc" }, // optional
  },
  {
    category: { type: ColumnTypes.Text, required: true } as Column<string>,
    id: { type: ColumnTypes.Uuid, required: true } as Column<string>,
    title: { type: ColumnTypes.Text, required: true } as Column<string>,
    price: { type: ColumnTypes.Double, required: true } as Column<number>,
    created_at: { type: ColumnTypes.Timestamp } as Column<Date>,
  },
);
```

---

## model

A model wraps a schema and provides the query interface.

```ts
const Product = new Model("Product", productSchema);
```

### methods

| method                     | description                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create(data)` / `obj()`   | create a new document (not persisted yet)                                                                                                                                            |
| `find(query, options?)`    | find documents matching the query, returns an array of documents                                                                                                                     |
| `findOne(query, options?)` | find a single document, if no document is found, returns `null`. Due the mapper limitation, note that all partition and clustering keys must be defined in order to use this method. |
|  |
| `update(query)`            | update documents matching the query                                                                                                                                                  |
| `delete(query)`            | delete documents matching the query                                                                                                                                                  |
| `countAll()`               | count all documents in the table                                                                                                                                                     |

---

## document

Documents are the objects you work with. They carry the data and a few helpers.

```ts
const product = Product.create({
  category: "books",
  id: uuid(),
  title: "ODM 101",
  price: 29.99,
});

await product.save(); // persist to ScyllaDB
await product.delete(); // delete from ScyllaDB
product.toRaw(); // plain object without internal fields
product.getChangedFields(original); // diff between current and original data
```

---

## query operators

Use MongoDB-style operators in your queries:

```ts
// exact match
await User.find({ name: "Alice" });

// comparison operators
await Product.find({ price: { $gt: 10, $lte: 50 } });

// list matching
await User.find({ age: { $in: [25, 30, 35] } });

// sorting
await Product.find({ category: "books" }, { $orderby: { created_at: "desc" } });

// raw results (skip document wrapping)
const raw = await Product.find({ category: "books" }, { raw: true });
```

---

## configuration

```ts
const client = new Client({
  modelsPath: "./db",
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
  keyspace: "myapp",
  port: 9042,
  maxRetries: 3,
  retryDelay: 1000,
  pooling: {
    coreConnectionsPerHost: {
      local: 2,
    },
    maxRequestsPerConnection: 1024,
  },
});
```

You can also configure via environment variables:

| variable                   | default            |
| -------------------------- | ------------------ |
| `SCYLLA_CONTACT_POINTS`    | `127.0.0.1`        |
| `SCYLLA_LOCAL_DATA_CENTER` | `datacenter1`      |
| `SCYLLA_KEYSPACE`          | `default_keyspace` |

---

## about the driver

This package ships a modified version of the `cassandra-driver`

---

## license

This project is licensed under the [MIT license](https://opensource.org/licenses/MIT).

The bundled `cassandra-driver` is licensed under the
[Apache License, Version 2.0](driver/LICENSE.txt).

```
Apache Cassandra NodeJS Driver
Copyright 2013 The Apache Software Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

See [`driver/LICENSE.txt`](driver/LICENSE.txt) and
[`driver/NOTICE.txt`](driver/NOTICE.txt) for the full legal text.
