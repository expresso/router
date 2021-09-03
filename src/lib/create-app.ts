import express, { Express } from 'express'
import {
  ComponentsObject,
  ExternalDocumentationObject,
  InfoObject,
  OpenApiBuilder,
  SecurityRequirementObject,
  ServerObject,
  TagObject
} from 'openapi3-ts'
import { HttpMethod, Routing } from './create-api'
import { wrapHandler } from './handler-wrapper'
import swaggerUi from 'swagger-ui-express'
import { errorHandler } from './error-handler'
import { createApi } from '..'

export type OpenApiInfo = {
  openapi: string
  info: InfoObject
  servers?: ServerObject[]
  components?: ComponentsObject
  security?: SecurityRequirementObject[]
  tags?: TagObject[]
  externalDocs?: ExternalDocumentationObject
}

export type CreateAppParams = {
  openApiInfo: OpenApiInfo
  routing: Routing
  app?: Express
  docsEndpoint?: string
  swaggerUiOptions?: any
}

/**
 * Creates an express app with the given routing and openapi info.
 * @param config Info and options
 * @param config.openApiInfo OpenAPI specification params
 * @param config.routing Route definitions
 * @param config.app Optional express app to use
 * @param config.docsEndpoint Optional endpoint for swagger-ui
 * @param config.swaggerUiOptions Optional options for swagger-ui
 * @returns Express app
 */
export const createApp = (config: CreateAppParams) => {
  const {
    openApiInfo,
    routing,
    app = express(),
    docsEndpoint = '/docs',
    swaggerUiOptions = {}
  } = config

  const wrappedRoutes = Object.fromEntries(
    Object.entries(routing).map(([path, route]) => [
      path,
      Object.fromEntries(
        Object.entries(route).map(([method, endpoint]) => {
          const handlers = Array.isArray(endpoint.handlers)
            ? endpoint.handlers
            : [endpoint.handlers]

          const wrappedHandlers = handlers.map((handler) =>
            wrapHandler(endpoint.input, handler)
          )

          const wrappedRouteDef = {
            ...endpoint,
            handlers: wrappedHandlers
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

  app.use(docsEndpoint, swaggerUi.serve)
  app.get(docsEndpoint, swaggerUi.setup(spec, swaggerUiOptions))

  // User Routes
  Object.entries(wrappedRoutes).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, endpoint]) => {
      app[method as HttpMethod](path, endpoint.handlers)
    })
  })

  app.use(errorHandler)

  return app
}
