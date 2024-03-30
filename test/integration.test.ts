import fs from 'node:fs'
const fsMock = sinon.stub(fs, 'writeFileSync')

import axiosist from 'axiosist'
import { strictEqual } from 'node:assert'
import { assert } from 'node:console'
import { after, before, describe, it } from 'node:test'
import { createApp, createEndpoint, z } from '../src'
import sinon from 'sinon'

const noop = () => {}

describe('create-app', () => {
  after(() => {
    sinon.restore()
  })
  it('should create an express app', () => {
    const app = createApp({
      openApiInfo: {
        info: {
          title: 'Test',
          version: '1.0.0',
        },
      },
      routing: {},
    })

    assert(app.listen)
  })

  it('should create an express app with routes', async () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {
          '/users': {
            '/me': {
              get: createEndpoint({
                handlers: [(_, res) => res.status(200).json({ ok: true })],
                output: {
                  200: {
                    body: z.object({ ok: z.literal(true) }),
                  },
                },
              }),
            },
          },
          '/ping': {
            get: createEndpoint({
              handlers: [(_, res) => res.status(200).json({ ok: true })],
              output: {
                200: {
                  body: z.object({ ok: z.literal(true) }),
                },
              },
            }),
          },
        },
      }),
    )

    assert(
      await app
        .get('/users/me')
        .then((res) => res.data)
        .then((data) => data.ok),
    )
    assert(
      await app
        .get('/ping')
        .then((res) => res.data)
        .then((data) => data.ok),
    )
  })

  it('should apply input validation', async () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {
          '/users': {
            post: createEndpoint({
              input: {
                body: z.object({
                  foo: z.string(),
                }),
              },
              handlers: [(_, res) => res.status(200).json({ ok: true })],
              output: {
                200: {
                  body: z.object({ ok: z.literal(true) }),
                },
              },
            }),
          },
        },
      }),
    )

    strictEqual(await app.post('/users', {}).then((res) => res.status), 422)
    strictEqual(await app.post('/users', { foo: 'bar' }).then((res) => res.status), 200)
  })

  it('should catch errors', async () => {
    const expressApp = createApp({
      openApiInfo: {
        info: {
          title: 'Test',
          version: '1.0.0',
        },
      },
      routing: {
        '/users': {
          post: createEndpoint({
            handlers: [
              async () => {
                throw new Error()
              },
            ],
            output: {},
          }),
        },
      },
    })

    expressApp.use((err, req, res, next) => {
      res.status(500).end()
    })

    const app = axiosist(expressApp)

    strictEqual(await app.post('/users').then((res) => res.status), 500)
  })

  describe('when UI endpoint is enabled', () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {},
        documentation: {
          ui: {
            endpoint: '/docs',
          },
        },
      }),
    )

    it('should create an express app with swagger-ui', async () => {
      const response = await app.get('/docs/')

      strictEqual(response.status, 200)
      assert(fsMock.notCalled)
    })
  })

  describe('when UI endpoint is disabled', () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {},
      }),
    )

    it('should create an express app without swagger-ui', async () => {
      const response = await app.get('/docs/')

      strictEqual(response.status, 404)
      assert(fsMock.notCalled)
    })
  })

  describe('when json and yaml endpoints are enabled', () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {},
        documentation: {
          json: true,
          yaml: true,
        },
      }),
    )

    it('should expose a json endpoint', async () => {
      const response = await app.get('/swagger.json')

      strictEqual(response.status, 200)
      assert(fsMock.notCalled)
    })

    it('should expose a yaml endpoint', async () => {
      const response = await app.get('/swagger.yaml')

      strictEqual(response.status, 200)
      assert(fsMock.notCalled)
    })
  })

  describe('when json and yaml endpoints are disabled', () => {
    const app = axiosist(
      createApp({
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: {},
      }),
    )

    it('should not expose a json endpoint', async () => {
      const response = await app.get('/swagger.json')

      strictEqual(response.status, 404)
      assert(fsMock.notCalled)
    })

    it('should not expose a yaml endpoint', async () => {
      const response = await app.get('/swagger.yaml')

      strictEqual(response.status, 404)
      assert(fsMock.notCalled)
    })
  })

  describe('when saved documentation is enabled', () => {
    const app = createApp({
      openApiInfo: {
        info: {
          title: 'Test',
          version: '1.0.0',
        },
      },
      routing: {},
      documentation: {
        fs: {
          path: 'docs.json',
          format: 'json',
        },
      },
    })

    it('should save the documentation', async () => {
      assert(fsMock.calledOnceWith('docs.json', sinon.match.string))
    })
  })
})
