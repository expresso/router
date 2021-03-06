import expresso from '@expresso/app'
import server from '@expresso/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createApp, createEndpoint, OpenApiInfo, Routing } from '../src'

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

const login = createEndpoint({
  summary: 'Get a new access token',
  description:
    'Validates user and password and returns a new token if everything is correct',
  tags: ['Usuários'],
  input: {
    body: z.object({
      email: z.string().email().min(1),
      password: z.string().min(16)
    })
  },
  output: {
    200: {
      body: z.object({
        token: z.string().min(1)
      })
    },
    401: {
      body: z.object({
        status: z.literal(401),
        message: z.string().min(1)
      })
    }
  },
  handlers: (req, res) => {
    const { email, password } = req.body

    const user = USERS.find((u) => u.email === email && u.password === password)

    if (!user) {
      res.status(401).json({
        status: 401,
        message: 'Usuário não encontrado'
      })
      return
    }

    res.status(200).json({
      token: 'token'
    })
  }
})

const dummy = createEndpoint({
  description: 'This is a dummy endpoint',
  input: {
    body: z.object({
      parent: z.object({
        child: z.string()
      })
    })
  },
  output: {
    200: {
      body: z.object({ ok: z.boolean() })
    }
  },
  handlers: (_req, res, _next) => {
    res.status(200).json({ ok: true })
  }
})

const routing: Routing = {
  '/users': {
    post: createUser
  },
  '/login': {
    post: login
  },
  '/dummy': {
    post: dummy
  }
}

const openApiInfo: OpenApiInfo = {
  info: {
    title: 'Test API',
    version: '1.0.0',
    contact: { email: 'roz@rjmunhoz.me' },
    license: {
      name: 'GPL 3.0',
      url: 'https://www.gnu.org/licenses/gpl-3.0.txt'
    }
  },
  openapi: '3.0.1',
  servers: [
    {
      url: '{protocol}://{host}:{port}',
      description: 'Local server',
      variables: {
        host: { default: 'localhost' },
        protocol: { enum: ['http', 'https'], default: 'http' },
        port: { default: '3000' }
      }
    }
  ]
}

const appFactory = expresso((app) =>
  createApp({
    openApiInfo,
    routing,
    app,
    documentation: {
      ui: {
        endpoint: '/docs'
      },
      json: true,
      yaml: true,
      fs: {
        path: './docs.yaml',
        format: 'yaml'
      }
    }
  })
)
server.start(appFactory, { name: 'Test API' })
