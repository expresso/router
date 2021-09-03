import { RequestHandler } from 'express'
import { EndpointCreationParams, Handler } from './create-endpoint'

export const wrapHandler =
  (
    inputSchema: EndpointCreationParams<any, any, any, any>[ 'input' ],
    handler: Handler<any, any, any, any>
  ): RequestHandler =>
  async (req, res, next) => {
    try {
      if (inputSchema.body) req.body = inputSchema.body.parse(req.body)
      if (inputSchema.query) req.query = inputSchema.query.parse(req.query)
      if (inputSchema.params) req.params = inputSchema.params.parse(req.params)

      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }
