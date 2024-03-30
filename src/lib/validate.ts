import { type RequestHandler } from 'express'
import { type EndpointParams } from './create-endpoint'

export function validate(inputSchema: EndpointParams<any, any, any, any>['input']): RequestHandler {
  return (req, _res, next) => {
    try {
      if (!inputSchema) {
        next()
        return
      }
      if (inputSchema.body) req.body = inputSchema.body.parse(req.body)
      if (inputSchema.query) req.query = inputSchema.query.parse(req.query)
      if (inputSchema.params) req.params = inputSchema.params.parse(req.params)

      next()
    } catch (err) {
      next(err)
    }
  }
}
