import { describe, it, mock } from 'node:test'
import { Routing, z } from '../src'
import { flattenRoutes, wrapWithRescueAndValidation } from '../src/lib/create-app'
import { deepStrictEqual, strictEqual } from 'node:assert'

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
      deepStrictEqual(result, {
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
      strictEqual(result['/users']['post'].handlers.length, 2)
      strictEqual(result['/ping']['get'].handlers.length, 1)
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
      strictEqual(result['/users/me']['post'].handlers.length, 2)
      strictEqual(result['/ping']['get'].handlers.length, 1)
    })
  })
})
