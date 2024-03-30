import assert from 'node:assert'
import { describe, it, mock } from 'node:test'
import Sinon from 'sinon'
import { Routing, z } from '../src'
import express from 'express'
import { createApp, flattenRoutes, wrapWithRescueAndValidation } from '../src/lib/create-app'
import { defaultErrorHandler } from '../src/lib/error-handler'

describe('create-app', () => {
  const noop = mock.fn()
  describe('flattenRoutes', () => {
    it('should flatten nested routes', () => {
      const routes: Routing = {
        '/users': {
          '/me': {
            get: {
              handlers: [noop],
              output: {},
            },
          },
        },
        '/ping': {
          get: {
            handlers: [noop],
            output: {},
          },
        },
      }
      const result = flattenRoutes(routes)
      assert.deepStrictEqual(result, {
        '/users/me': {
          get: {
            handlers: [noop],
            output: {},
          },
        },
        '/ping': {
          get: {
            handlers: [noop],
            output: {},
          },
        },
      })
    })
  })

  describe('wrapWithRescueAndValidation', () => {
    it('should wrap handlers with rescue and validation', () => {
      const routes: Routing = {
        '/users': {
          post: {
            input: {
              body: z.object({
                foo: z.string(),
              }),
            },
            handlers: [
              (_req, _res, next) => {
                return next()
              },
            ],
            output: {},
          },
        },
        '/ping': {
          get: {
            handlers: [
              (_req, _res, next) => {
                return next()
              },
            ],
            output: {},
          },
        },
      }
      const result = wrapWithRescueAndValidation(routes)
      assert.strictEqual(result['/users']['post'].handlers.length, 2)
      assert.strictEqual(result['/ping']['get'].handlers.length, 1)
    })

    it('should handle nested routes', () => {
      const routes: Routing = {
        '/users': {
          '/me': {
            post: {
              input: {
                body: z.object({
                  foo: z.string(),
                }),
              },
              handlers: [
                (_req, _res, next) => {
                  return next()
                },
              ],
              output: {},
            },
          },
        },
        '/ping': {
          get: {
            handlers: [
              (_req, _res, next) => {
                return next()
              },
            ],
            output: {},
          },
        },
      }
      const result = wrapWithRescueAndValidation(routes)
      assert.strictEqual(result['/users/me']['post'].handlers.length, 2)
      assert.strictEqual(result['/ping']['get'].handlers.length, 1)
    })
  })

  describe('global errorHandler overrides', () => {
    it('should allow the user to override the default error handler', () => {
      const routes: Routing = {
        '/ping': {
          get: {
            handlers: [noop],
            output: {
              200: {
                body: {
                  foo: z.string(),
                },
              },
            },
          },
        },
      }

      const useSpy = Sinon.spy()
      const mockHandler = Sinon.spy()
      const app = express()
      app.use = useSpy

      createApp({
        app,
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: routes,
        errorHandler: mockHandler,
      })

      assert.strictEqual(useSpy.callCount, 1)
      assert.strictEqual(useSpy.firstCall.args[0], mockHandler)
    })

    it('should use the default error handler if not set up', () => {
      const routes: Routing = {
        '/ping': {
          get: {
            handlers: [noop],
            output: {
              200: {
                body: {
                  foo: z.string(),
                },
              },
            },
          },
        },
      }

      const useSpy = Sinon.spy()
      const app = express()
      app.use = useSpy

      createApp({
        app,
        openApiInfo: {
          info: {
            title: 'Test',
            version: '1.0.0',
          },
        },
        routing: routes,
      })

      assert.strictEqual(useSpy.callCount, 1)
      assert.strictEqual(useSpy.firstCall.args[0], defaultErrorHandler)
    })
  })
})
