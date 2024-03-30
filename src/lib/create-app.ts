import express, { type ErrorRequestHandler, type Express } from 'express'
import fs from 'node:fs'
import {
  OpenApiBuilder,
  type ComponentsObject,
  type ExternalDocumentationObject,
  type InfoObject,
  type OpenAPIObject,
  type SecurityRequirementObject,
  type ServerObject,
  type TagObject,
} from 'openapi3-ts/oas31'
import swaggerUi from 'swagger-ui-express'
import yaml from 'yaml'
import { createApi, type FlatRouting, type HttpMethod, type Route } from './create-api'
import { type ErrorHandler, type Handler } from './create-endpoint'
import { defaultErrorHandler } from './error-handler'
import { rescue } from './rescue'
import { validate } from './validate'

/**
 * OpenAPI definitions for the API object.
 */
export interface OpenApiInfo {
  info: InfoObject
  servers?: ServerObject[]
  components?: ComponentsObject
  security?: SecurityRequirementObject[]
  tags?: TagObject[]
  externalDocs?: ExternalDocumentationObject
}

interface UIOptions {
  endpoint: string
  swaggerUiExpressOptions?: Record<string, any>
}

interface FSOptions {
  path: string
  format: 'json' | 'yaml'
}

/**
 * Routing is a tree-like structure that defines the API routes.
 * It can be flat or nested. Which means you can have a single route definition
 * using the path as the key and the route definition as the value
 * or you can nest routes by using an object where the key is the prefix
 * and the value is another routing object with the path as the key and the route
 * as the value
 *
 * This structure only supports a single level of nesting.
 *
 * @example
 * ```ts
 * const routing = {
 *   '/ping': {
 *     get: {
 *       handlers: [],
 *       output: {
 *         200: {
 *           body: <your schema here>,
 *         },
 *       },
 *     },
 *   },
 *   '/users': {
 *     '/me': {
 *       get: {
 *         handlers: [],
 *         output: {
 *           200: {
 *             body: <your schema here>,
 *           },
 *         },
 *       },
 *     },
 *   },
 * }
 * ```
 */
export type Routing = FlatRouting | Record<string, FlatRouting | Route>

/**
 * Params for creating the api
 * @param openApiInfo OpenAPI specification params
 * @param routing Route definitions
 * @param [app] Optional express app to use, if not passed a new express app will be created
 * @param [errorHandler] Optional error handler to use, if not passed the default error handler will be used
 * @param [documentation] Optional documentation options
 */
export interface CreateAppParams {
  openApiInfo: OpenApiInfo
  routing: Routing
  app?: Express
  errorHandler?: ErrorRequestHandler
  documentation?:
    | Partial<{
        ui: UIOptions
        yaml: boolean
        json: boolean
        fs: FSOptions
      }>
    | false
}

const OPENAPI_SPEC_VERSION = '3.1.0'

function installUi(app: Express, spec: OpenAPIObject, options: UIOptions) {
  app.use(options.endpoint, swaggerUi.serve)
  app.get(options.endpoint, swaggerUi.setup(spec, options.swaggerUiExpressOptions))
}

function installSpec(app: Express, spec: OpenAPIObject, format: 'json' | 'yaml') {
  app.get(`/swagger.${format}`, (_, res) => {
    return format === 'json' ? res.status(200).json(spec) : res.status(200).send(yaml.stringify(spec)).end()
  })
}

function saveSpec(spec: OpenAPIObject, options: FSOptions) {
  const content = options.format === 'json' ? JSON.stringify(spec, null, 4) : yaml.stringify(spec)

  fs.writeFileSync(options.path, content)
}

const isNestedRouting = (routing: Record<string, unknown>): routing is Record<string, FlatRouting> =>
  Object.keys(routing).every((key) => key.startsWith('/'))

export function flattenRoutes<T extends Routing>(routing: T) {
  const result: FlatRouting = {}

  for (const [path, route] of Object.entries(routing)) {
    if (isNestedRouting(route)) {
      for (const [nestedPath, nestedRoute] of Object.entries(route)) {
        result[`${path}${nestedPath}`] = nestedRoute
      }
      continue
    }
    result[path] = route
  }

  return result
}

export function wrapWithRescueAndValidation<T extends FlatRouting>(routing: T) {
  const flatRoutes = flattenRoutes(routing)
  return Object.fromEntries(
    Object.entries(flatRoutes).map(([path, route]) => [
      path,
      Object.fromEntries(
        Object.entries(route).map(([method, endpoint]) => {
          const handlers = Array.isArray(endpoint.handlers) ? endpoint.handlers : [endpoint.handlers]
          const rescuedHandlers = handlers.map(rescue)
          const finalHandlers = endpoint.input ? [validate(endpoint.input), ...rescuedHandlers] : rescuedHandlers
          const wrappedRouteDef = {
            ...endpoint,
            handlers: finalHandlers,
          }
          return [method, wrappedRouteDef]
        }),
      ),
    ]),
  )
}

function createExpressApp() {
  const app = express()
  app.use(express.json())
  return app
}

/**
 * Creates an express app with the given routing and openapi info.
 * @param config Info and options
 * @param config.openApiInfo OpenAPI specification params
 * @param config.routing Route definitions
 * @param config.app Optional express app to use
 * @param config.docsEndpoint Optional endpoint for swagger-ui
 * @param config.swaggerUiExpressOptions Optional options for swagger-ui
 * @returns Express app
 */
export function createApp(config: CreateAppParams) {
  const { openApiInfo, routing, app = createExpressApp(), documentation, errorHandler = defaultErrorHandler } = config

  const wrappedRoutes: FlatRouting = wrapWithRescueAndValidation(routing)

  const paths = createApi(routing)

  const spec = new OpenApiBuilder({
    ...openApiInfo,
    openapi: OPENAPI_SPEC_VERSION,
    paths,
  }).getSpec()

  if (documentation) {
    if (documentation?.ui) {
      installUi(app, spec, documentation.ui)
    }

    if (documentation?.json) {
      installSpec(app, spec, 'json')
    }

    if (documentation?.yaml) {
      installSpec(app, spec, 'yaml')
    }

    if (documentation?.fs) {
      saveSpec(spec, documentation.fs)
    }
  }

  // Apply user routes
  for (const [path, methods] of Object.entries(wrappedRoutes)) {
    for (const [method, endpoint] of Object.entries(methods)) {
      const handlers: Array<Handler | ErrorHandler> = Array.isArray(endpoint.handlers)
        ? endpoint.handlers
        : [endpoint.handlers]

      // If the route has an error handler, add it to the handlers array
      // This will make sure that the error handler is executed after the handlers for that route only
      if (endpoint.errorHandler) {
        handlers.push(endpoint.errorHandler)
      }
      app[method as HttpMethod](path, ...handlers)
    }
  }

  app.use(errorHandler)

  return app
}
