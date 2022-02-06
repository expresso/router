import express, { Express } from 'express'
import fs from 'fs'
import {
  ComponentsObject,
  ExternalDocumentationObject,
  InfoObject,
  OpenApiBuilder,
  OpenAPIObject,
  SecurityRequirementObject,
  ServerObject,
  TagObject
} from 'openapi3-ts'
import swaggerUi from 'swagger-ui-express'
import yaml from 'yaml'
import { createApi } from '..'
import { HttpMethod, Routing } from './create-api'
import { errorHandler } from './error-handler'
import { rescue } from './rescue'
import { validate } from './validate'

export type OpenApiInfo = {
  openapi: string
  info: InfoObject
  servers?: ServerObject[]
  components?: ComponentsObject
  security?: SecurityRequirementObject[]
  tags?: TagObject[]
  externalDocs?: ExternalDocumentationObject
}

type UIOptions = {
  endpoint: string
  swaggerUiExpressOptions?: Record<string, any>
}

type FSOptions = {
  path: string
  format: 'json' | 'yaml'
}

export type CreateAppParams = {
  openApiInfo: OpenApiInfo
  routing: Routing
  app?: Express
  documentation?:
    | Partial<{
        ui: UIOptions
        yaml: Boolean
        json: Boolean
        fs: FSOptions
      }>
    | false
}

function installUi(app: Express, spec: OpenAPIObject, options: UIOptions) {
  app.use(options.endpoint, swaggerUi.serve)
  app.get(
    options.endpoint,
    swaggerUi.setup(spec, options.swaggerUiExpressOptions)
  )
}

function installSpec(
  app: Express,
  spec: OpenAPIObject,
  format: 'json' | 'yaml'
) {
  app.get(`/swagger.${format}`, (_, res) => {
    return format === 'json'
      ? res.status(200).json(spec)
      : res.status(200).send(yaml.stringify(spec)).end()
  })
}

function saveSpec(spec: OpenAPIObject, options: FSOptions) {
  const content =
    options.format === 'json'
      ? JSON.stringify(spec, null, 4)
      : yaml.stringify(spec)

  fs.writeFileSync(options.path, content)
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
export const createApp = (config: CreateAppParams) => {
  const { openApiInfo, routing, app = express(), documentation } = config

  const wrappedRoutes = Object.fromEntries(
    Object.entries(routing).map(([path, route]) => [
      path,
      Object.fromEntries(
        Object.entries(route).map(([method, endpoint]) => {
          const handlers = Array.isArray(endpoint.handlers)
            ? endpoint.handlers
            : [endpoint.handlers]

          const rescuedHandlers = handlers.map(rescue)

          const wrappedRouteDef = {
            ...endpoint,
            handlers: [validate(endpoint.input), ...rescuedHandlers]
          }

          return [method, wrappedRouteDef]
        })
      )
    ])
  )

  const paths = createApi(routing)

  const spec = new OpenApiBuilder({
    ...openApiInfo,
    paths
  }).getSpec()

  if (documentation && documentation?.ui) {
    installUi(app, spec, documentation.ui)
  }

  if (documentation && documentation.json) {
    installSpec(app, spec, 'json')
  }

  if (documentation && documentation.yaml) {
    installSpec(app, spec, 'yaml')
  }

  if (documentation && documentation.fs) {
    saveSpec(spec, documentation.fs)
  }

  // User Routes
  Object.entries(wrappedRoutes).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, endpoint]) => {
      app[method as HttpMethod](path, endpoint.handlers)
    })
  })

  app.use(errorHandler)

  return app
}
