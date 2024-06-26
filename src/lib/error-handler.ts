import { type NextFunction, type Request, type Response } from 'express'
import { ZodError } from 'zod'

export const defaultErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Validation error. See `details` property',
      details: err.issues,
    })
  }

  next(err)
}
