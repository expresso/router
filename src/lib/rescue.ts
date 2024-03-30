import { type Handler, type ResponseMap } from '..'

export function rescue<RequestBody, Params, Query, ResponseBodies extends ResponseMap>(
  handler: Handler<RequestBody, Params, Query, ResponseBodies>,
): Handler<RequestBody, Params, Query, ResponseBodies> {
  const rescuedRoute = async (
    req: Parameters<typeof handler>[0],
    res: Parameters<typeof handler>[1],
    next: Parameters<typeof handler>[2],
  ) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      next(err)
    }
  }

  return rescuedRoute
}
