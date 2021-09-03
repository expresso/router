Expresso Framework
---

> Self documented, self validated, typescript-first API framework written on top of Express

## Usage

```typescript
import crypto from 'crypto'
import { z } from 'zod'
import { createEndpoint, createApp, Routing, OpenApiInfo } from '../src'

const endpoint = createEndpoint({
  description: 'Creates a new user',
  input: {
    body: z.object({
      name: z.string().min(1),
      email: z.string().email().min(1),
      password: z.string().min(16)
    })
  },
  output: {
    201: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email().min(1)
    }),
    409: z.object({
      status: z.literal(409),
      message: z.string().min(1)
    })
  },
  handlers: (req, res) => {
    const { name, email } = req.body

    const id = crypto.randomBytes(16).toString('hex')

    res.status(201).json({
      id,
      name,
      email
    })
  }
})

const routing: Routing = {
  '/users': {
    post: {
      description: 'Create new user',
      endpoint
    }
  }
}

const openApiInfo: OpenApiInfo = {
  info: {
    title: 'Test API',
    version: '1.0.0'
  },
  openapi: '3.0.1',
  servers: [{ url: 'http://localhost:3000' }]
}

const app = createApp(openApiInfo, routing)

app.listen(3000, () => {
  console.log('Listening on 3000')
})
```
