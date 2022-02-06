import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Validation error. See `details` property',
      details: err.issues
    })
  }

  return next(err)
}
