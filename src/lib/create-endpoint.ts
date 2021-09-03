import * as z from 'zod'
import * as Express from 'express'
import * as core from 'express-serve-static-core'
import { ZodObject, ZodSchema, ZodTypeAny } from 'zod'
import { OperationObject } from 'openapi3-ts'
import { generateSchema } from '@anatine/zod-openapi'

const emptySchema = z.object({})

type ValueOf<T> = T[keyof T]
type Responses = Record<string, ZodSchema<any>>
type FinalOut<OUT extends Responses> = ValueOf<
  { [k in keyof OUT]: z.infer<OUT[k]> }
>

export type Handler<B, P, Q, OUT extends Responses> = (
  req: Express.Request<P, FinalOut<OUT>, B, Q>,
  res: core.Response<FinalOut<OUT>, any>,
  next: Express.NextFunction
) => void | Promise<void>

type OneOrMore<T> = T | T[]

export type EndpointCreationParams<
  B,
  P,
  Q,
  OUT extends { [x: number]: ZodSchema<any> }
> = Partial<OperationObject> & {
  input: {
    body?: ZodSchema<B>
    params?: ZodObject<{ [k in keyof P]: ZodTypeAny }, 'strip', ZodTypeAny, P>
    query?: ZodObject<{ [k in keyof Q]: ZodTypeAny }, 'strip', ZodTypeAny, Q>
  }
  output: OUT
  handlers: OneOrMore<Handler<B, P, Q, OUT>>
}

export type Endpoint<B, P, Q, OUT extends Responses> = OperationObject & {
  handlers: OneOrMore<Handler<B, P, Q, OUT>>
  input: {
    body?: ZodSchema<any>
    params?: ZodObject<any>
    query?: ZodObject<any>
  }
  output: OUT
}

export const createEndpoint = <
  B,
  P,
  Q,
  OUT extends { [x: number]: ZodSchema<any> }
>(
  creationParams: EndpointCreationParams<B, P, Q, OUT>
): Endpoint<B, P, Q, OUT> => {
  const {
    description,
    input: { body = emptySchema, params = emptySchema, query = emptySchema },
    output,
    handlers,
    ...extraParams
  } = creationParams

  return {
    description,
    ...extraParams,
    responses: Object.fromEntries(
      Object.entries(output).map(([status, schema]) => {
        if (!`${status}`.match(/\d{3}/)) {
          throw new Error(`Invalid status code: ${status}`)
        }

        return [
          status,
          {
            description: '',
            content: { 'application/json': { schema: generateSchema(schema) } }
          }
        ]
      })
    ),
    parameters: [
      ...Object.entries(params._def.shape()).map(([key, value]) => ({
        in: 'path' as const,
        name: key,
        required: true,
        schema: generateSchema(value as ZodTypeAny)
      })),
      ...Object.entries(query._def.shape()).map(([key, value]) => ({
        name: key,
        in: 'query' as const,
        schema: generateSchema(value as ZodTypeAny)
      }))
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: generateSchema(body)
        }
      }
    },
    handlers,
    input: { body, params, query },
    output
  }
}
