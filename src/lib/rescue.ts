import { Handler, ResponseMap } from '..'

export const rescue =
  <RequestBody, Params, Query, ResponseBodies extends ResponseMap>(
    handler: Handler<RequestBody, Params, Query, ResponseBodies>
  ) =>
  async (
    req: Parameters<typeof handler>[0],
    res: Parameters<typeof handler>[1],
    next: Parameters<typeof handler>[2]
  ) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      return next(err)
    }
  }
