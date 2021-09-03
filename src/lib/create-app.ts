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

export const createApp = (
  openApiInfo: OpenApiInfo,
  routing: Routing,
  app: Express = express()
) => {
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

  app.use('/docs', swaggerUi.serve)
  app.get('/docs', swaggerUi.setup(spec))

  // User Routes
  Object.entries(wrappedRoutes).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, endpoint]) => {
      app[method as HttpMethod](path, endpoint.handlers)
    })
  })

  app.use(errorHandler)

  return app
}
