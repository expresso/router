# Expresso Framework

> Self documented, self validated, typescript-first API framework written on top of Express

## Features

- Automatic input validation with [Zod](https://www.npmjs.com/package/zod)
- Type safe input and output
- Auto generated documentation

## Usage

### Defining an endpoint

Expresso router's main function is the `createEndpoint` function. This function is responsible for building the OpenAPI metadata that will be later used to generate the swagger ui documentation.

When creating an endpoint, you need to describe its input, output and give it at least one handler.

The `input` property is an object containing a `body`, `params` and / or `query` properties, each being a Zod schema. The corresponding `req` properties will be validated and transformed using these schemas. You can also specify a `headers` property, which should contain a map of `<string, HeaderObject>` according to OpenAPI spefication. **These headers will not be automatically validaded for now**

The `output` property is an object literal having one property for each possible status code for that endpoint. Each status code receives a `body` property, which is the Zod schema describing the body of that response. Optionally, each status code can also have a `headers` property, containing the Response headers for that status code. The `res.json` typing will ensure that you fulfill at least one of the response bodies, but **will not** match the status code and body (this is a typing limitation and PRs are very welcome).

The `handlers` property is a function or array of optionally async functions. Errors and async errors are automatically captured and fed to `next`, so the express error handling flow works as normal.

Besides the `input`, `output` and `handlers` properties. All other OpenAPI properties for an endpoint are supported, but optional. We recommend using the `tags` property to group this endpoint with other similar ones and the `description` property to add a little bit of context to your endpoints. If you don't specify a `tags` property, the endpoint will be grouped with the default tag `"default"`.

You can see more about the OpenAPI specification at [https://swagger.io/](https://swagger.io/).

```typescript
import crypto from 'crypto';
import { z } from 'zod';
import { createEndpoint } from '@expresso/router';

type User = { id: string; name: string; email: string; password: string }

const USERS: User[] = []

const createUser = createEndpoint({
  description: 'If you call this and a user already exists, it will be shit',
  summary: 'Create a new user',
  tags: ['Usuários'],
  input: {
    body: z.object({
      name: z.string().min(1),
      email: z.string().email().min(1),
      password: z.string().min(16)
    }),
    query: z.object({
      testNumber: z
        .string()
        .refine((s) => !Number.isNaN(Number(s)))
        .transform((n) => parseInt(n, 10))
        .optional()
    }),
    headers: {
      authorization: {
        description: 'Authorization token'
      }
    }
  },
  output: {
    201: {
      body: z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().min(1)
      }),
      headers: {
        'x-content-range': {
          description: 'Describes a content range'
        }
      }
    },
    409: {
      body: z.object({
        status: z.literal(409),
        message: z.string().min(1)
      })
    }
  },
  handlers: [
    (_req, _res, next) => {
      next()
    },
    (req, res) => {
      const { name, email, password } = req.body

      const id = crypto.randomBytes(16).toString('hex')

      USERS.push({
        id,
        name,
        email,
        password
      })

      res.status(201).json({
        id,
        name,
        email
      })
    }
  ]
})
```

### Defining routes

The routing object has the paths at its main level, with each path having properties for the HTTP methods they handle. The `Routing` type defines a routing object:

```typescript
import { createUser } from './endpoints/create-user.ts';
import { Routing } from '@expresso/router';

export const routing: Routing = {
  '/users': {
    post: createUser,
  },
};
```

### Putting everything together

Now that you have your endpoints and routes, it's time to create the app. The `createApp` function runs an `express` server equipped with the routes and endpoints, plus a `GET /docs` endpoint which renders the swagger UI documentation.

In order to be able to generate an OpenAPI spec, we need more information about your app, in order to fill required fields in the documentation. More specifically, we need the `title`, `version` and `openapi` properties. All other properties are supported, but optional.

The result is an express app which you can use just like any other express app, including adding new routes, middlewares, error middlewares or starting a server with `app.listen()`.

You can specify your own app by passing a custom `app` property to the `createApp` options object. This is useful if you want to use your own express middlewares, or if you want to use a different version of express.

The documentation can be customized via the `documentation` property, which accepts four optional properties, each one describing one manner of exposing documentation:

- `ui` (object): Generates the swagger UI documentation
  - `endpoint` (string): Endpoint through which swaggerUI will be available
  - `swaggerUiExpressOptions` (string): Options to be passed to swagguer-ui-express as-is
- `yaml` (boolean): Serves a yaml document containing the OpenAPI specification for the API in the `GET /swagger.yaml` endpoint
- `json` (boolean): Serves a json document containing the OpenAPI specification for the API in the `GET /swagger.json` endpoint
- `fs` (object): Saves the specification as a file in the given path
  - `path` (string): Path where the file should be saved (with file extension)
  - `format` (`'json'` | `'yaml'`): Specifies the format of the generated document

```typescript
import { routing } from './routing.ts'
import { createApp, OpenApiInfo } from '../src'

const openApiInfo: OpenApiInfo = {
  info: {
    title: 'Test API',
    version: '1.0.0'
  },
  openapi: '3.0.1',
  servers: [{ url: 'http://localhost:3000' }]
}

const app = createApp({
  openApiInfo,
  routing,
  documentation: {
    json: true,
    fs: {
      path: './docs/swagger.json',
      format: 'json'
    }
  }
})

app.listen(3000, () => {
  console.log('Listening on 3000')
})
```
