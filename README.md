# Expresso Router

> Self documented, self validated, typescript-first router for express

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Expresso Router](#expresso-router)
  - [Features](#features)
  - [Usage](#usage)
    - [Defining an endpoint](#defining-an-endpoint)
      - [Endpoint error handling](#endpoint-error-handling)
      - [Global Error Handling](#global-error-handling)
    - [Zod extension](#zod-extension)
    - [Defining routes](#defining-routes)
      - [Simple routes](#simple-routes)
      - [Nested (prefixed) routes](#nested-prefixed-routes)
  - [Putting everything together](#putting-everything-together)

<!-- /code_chunk_output -->

## Features

- Automatic input validation with [Zod](https://www.npmjs.com/package/zod)
- Automatic OpenAPI extension with Zod
- Type safe input and output
- Auto generated documentation

## Usage

### Defining an endpoint

Expresso router's main function is the `createEndpoint` function. This function is responsible for building the OpenAPI metadata that will be later used to generate the swagger ui documentation.

When creating an endpoint, you need to describe its input, output and give it at least one handler.

The `input` property is an object containing a `body`, `params` and / or `query` properties, each being a Zod schema. If your request has no inputs you can omit this property. The corresponding `req` properties will be validated and transformed using these schemas. You can also specify a `headers` property, which should contain a map of `<string, HeaderObject>` according to OpenAPI spefication. **These headers will not be automatically validaded for now**

The `output` property is an object literal having one property for each possible status code for that endpoint. Each status code receives a `body` property, which is the Zod schema describing the body of that response. Optionally, each status code can also have a `headers` property, containing the Response headers for that status code. The `res.status().json()` typing will ensure that you use the correct body for the status you choose.

The `handlers` property is a function or array of optionally async functions. Errors and async errors are automatically captured and fed to `next`, so the express error handling flow works as normal.

Besides the `input`, `output` and `handlers` properties. All other OpenAPI properties for an endpoint are supported, but optional. We recommend using the `tags` property to group this endpoint with other similar ones and the `description` property to add a little bit of context to your endpoints. If you don't specify a `tags` property, the endpoint will be grouped with the default tag `"default"`.

You can see more about the OpenAPI specification at [https://swagger.io/](https://swagger.io/).

```typescript
import crypto from 'crypto';
import { createEndpoint, z } from '@expresso/router';

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

#### Endpoint error handling

Each endpoint object allows you to pass a single error handler function, this function is an Express error handling middleware with the signature `(err: any, req: Request, res: Response, next: NextFunction) => void`.

This object is optional and can be passed as the `errorHandler` property of the endpoint object. If you pass it, the error handler will be concatenated in the end of the handlers array, so it will be called after all other handlers in case there's an error.

```typescript
import crypto from 'crypto';
import { createEndpoint, z } from '@expresso/router';

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
      if (checkEmailExists(email)) {
        next(new UserError('Email already exists'))
        return
      }

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
  ],
  errorHandler: (err, _req, res) => {
    if (err instanceof UserError) {
      return res.status(409).json({
        status: 409,
        message: err.message
      })
    }
  }
})
```

**Note**: The error handler passed to this property will only be available to this particular endpoint, if you want to create a global error handler, you can either use the `app.use` function **after** the `createApp` function, or you can refer to the [global error handling](#global-error-handling) section.

#### Global Error Handling

You can also pass a global error handler to the `createApp` function. This function is an Express error handling middleware with the signature `(err: any, req: Request, res: Response, next: NextFunction) => void`.

This error handler is optional and **will be applied to all the routes in the API**. If you pass it, the handler will be called using `app.use` after the routes are added to the app.

If this property is omitted, the default error handler will be used, this error handler is defined in [this file](./src/lib/error-handler.ts) and has the following signature:

```ts
export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Validation error. See `details` property',
      details: err.issues,
    })
  }

  next(err)
}
```

It will only return a 422 status code with the validation issues if the error is an instance of `ZodError` (which means it will only capture validation errors), otherwise it will call `next(err)` allowing you to chain more handlers in the end of the middleware chain.

### Zod extension

The router also exports an extension of the Zod lib with an extra method, `openapi`. This method is used to add OpenAPI metadata to the schema, which will be used to generate the swagger documentation. The `openapi` method receives an object with the OpenAPI properties you want to add to the schema.

This feature uses the underlying `extendZodWithOpenApi` function from the [@anatine/zod-openapi](https://www.npmjs.com/package/@anatine/zod-openapi) package. If you want to import your own Zod function, this is also possible, just make sure to use the `extendZodWithOpenApi` function from the same package.

```typescript
import crypto from 'crypto';
import { createEndpoint, z } from '@expresso/router';

type User = { id: string; name: string; email: string; password: string }

const USERS: User[] = []

const createUser = createEndpoint({
  description: 'If you call this and a user already exists, it will be shit',
  summary: 'Create a new user',
  tags: ['Usuários'],
  input: {
    body: z.object({
      name: z.string().min(1).openapi({ description: 'This is the username', example: 'JohnDoe' }),
      email: z.string().email().min(1),
      password: z.string().min(16)
    }),
    query: z.object({
      testNumber: z
        .string()
        .refine((s) => !Number.isNaN(Number(s)))
        .transform((n) => parseInt(n, 10))
        .optional()
        .openapi({ default: 100 })
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

**Note:** All data included in the `openapi` method will not be used for validation, only for documentation purposes.

### Defining routes

#### Simple routes

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

#### Nested (prefixed) routes

You can also nest routes by creating a new `Routing` object inside the parent route. This is useful for grouping routes that share a common prefix.

```typescript
import { createUser, updateUser, deleteUser } from './endpoints/create-user.ts';
import { getMe } from './endpoints/me.ts';
import { Routing } from '@expresso/router';

export const routing: Routing = {
  '/users': {
    '/': {
      post: createUser,
    },
    '/:id': {
      get: getUser,
      put: updateUser,
      delete: deleteUser,
    },
  },
  '/me': {
    get: getMe,
  }
};
```

## Putting everything together

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
