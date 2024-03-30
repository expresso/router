import express, { type Express } from 'express'
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
import { createApi } from '..'
import { type HttpMethod, type Routing } from './create-api'
import { errorHandler } from './error-handler'
import { rescue } from './rescue'
import { validate } from './validate'

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

export interface CreateAppParams {
  openApiInfo: OpenApiInfo
  routing: Routing
  app?: Express
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

function wrapWithRescueAndValidation<T extends Routing>(routing: T) {
  return Object.fromEntries(
    Object.entries(routing).map(([path, route]) => [
      path,
      Object.fromEntries(
        Object.entries(route).map(([method, endpoint]) => {
          const handlers = Array.isArray(endpoint.handlers) ? endpoint.handlers : [endpoint.handlers]
          const rescuedHandlers = handlers.map(rescue)
          const wrappedRouteDef = {
            ...endpoint,
            handlers: [validate(endpoint.input), ...rescuedHandlers],
          }
          return [method, wrappedRouteDef]
        }),
      ),
    ]),
  )
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
  const { openApiInfo, routing, app = express(), documentation } = config

  const wrappedRoutes: Routing = wrapWithRescueAndValidation(routing)

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
      app[method as HttpMethod](path, endpoint.handlers)
    }
  }

  app.use(errorHandler)

  return app
}
