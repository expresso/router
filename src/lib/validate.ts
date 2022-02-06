import { RequestHandler } from 'express'
import { EndpointParams } from './create-endpoint'

export const validate =
  (inputSchema: EndpointParams<any, any, any, any>['input']): RequestHandler =>
  async (req, _res, next) => {
    try {
      if (inputSchema.body) req.body = inputSchema.body.parse(req.body)
      if (inputSchema.query) req.query = inputSchema.query.parse(req.query)
      if (inputSchema.params) req.params = inputSchema.params.parse(req.params)

      return next()
    } catch (err) {
      next(err)
    }
  }
