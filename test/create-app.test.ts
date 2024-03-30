import { describe, it } from 'node:test'
import { flattenRoutes, wrapWithRescueAndValidation } from '../src/lib/create-app'
import { MaybeNestedRouting, Routing, z } from '../src'
import { assert } from 'node:console'
import { deepStrictEqual, strictEqual } from 'node:assert'

describe('create-app', () => {
  describe('flattenRoutes', () => {
    it('should flatten nested routes', () => {
      const routes: MaybeNestedRouting = {
        '/users': {
          '/me': {
            get: {
              handlers: [],
              output: {},
            },
          },
        },
        '/ping': {
          get: {
            handlers: [],
            output: {},
          },
        },
      }
      const result = flattenRoutes(routes)
      deepStrictEqual(result, {
        '/users/me': {
          get: {
            handlers: [],
            output: {},
          },
        },
        '/ping': {
          get: {
            handlers: [],
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
      const routes: MaybeNestedRouting = {
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
