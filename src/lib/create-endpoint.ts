import { generateSchema } from '@anatine/zod-openapi'
import * as Express from 'express'
import {
  HeadersObject,
  OperationObject,
  ParameterLocation,
  ResponseObject
} from 'openapi3-ts'
import { z, ZodObject, ZodTypeAny } from 'zod'

const emptySchema = z.object({})

export type OneOrMore<T> = T | T[]
export type ValueOf<T> = T[keyof T]
export type ResponseDefinition = {
  body: ZodTypeAny
  headers?: HeadersObject
}
export type ResponseMap = Record<string, ResponseDefinition>
export type InferBodyValues<T extends ResponseMap> = {
  [k in keyof T]: z.infer<T[k]['body']>
}

export type Handler<
  RequestBody,
  Params,
  Query,
  ResponseBody extends ResponseMap
> = (
  req: Express.Request<Params, ResponseBody, RequestBody, Query>,
  res: Express.Response<ValueOf<InferBodyValues<ResponseBody>>>,
  next: Express.NextFunction
) => any

export type Endpoint<
  RequestBody,
  Params,
  Query,
  ResponseBodies extends ResponseMap
> = OperationObject & {
  handlers: OneOrMore<Handler<RequestBody, Params, Query, ResponseBodies>>
  input: {
    body?: ZodObject<any>
    params?: ZodObject<any>
    query?: ZodObject<any>
  }
  output: ResponseBodies
}

export type EndpointParams<
  RequestBody,
  Params,
  Query,
  ResponseBodies extends ResponseMap
> = Partial<OperationObject> & {
  input: {
    body?: ZodObject<any, 'strip', ZodTypeAny, RequestBody, any>
    params?: ZodObject<any, 'strip', ZodTypeAny, Params, any>
    query?: ZodObject<any, 'strip', ZodTypeAny, Query, any>
    headers?: HeadersObject
  }
  output: ResponseBodies
  handlers: OneOrMore<Handler<RequestBody, Params, Query, ResponseBodies>>
}

const getResponseFromOutput = ([status, definition]: [
  string,
  ResponseDefinition
]): [string, ResponseObject] => {
  if (!`${status}`.match(/\d{3}/)) {
    throw new Error(`Invalid status code: ${status}`)
  }

  const response: ResponseObject = {
    description: '',
    content: {
      'application/json': { schema: generateSchema(definition.body) }
    }
  }

  if (definition.headers) {
    response.headers = Object.fromEntries(
      Object.entries(definition.headers).map(([key, value]) => [
        key,
        { schema: { type: 'string' }, ...value }
      ])
    )
  }

  return [status, response]
}

export const createEndpoint = <
  RequestBody,
  Params,
  Query,
  ResponseBodies extends { [x: number]: ResponseDefinition }
>(
  definition: EndpointParams<RequestBody, Params, Query, ResponseBodies>
): Endpoint<RequestBody, Params, Query, ResponseBodies> => {
  const { input, output, handlers, ...openApiParams } = definition

  const responses = Object.fromEntries(
    Object.entries(output).map(getResponseFromOutput)
  )

  const params = [
    ...Object.entries(input.params ? input.params._def.shape() : {}).map(
      ([key, value]) => ({
        in: 'path' as const,
        name: key,
        required: true,
        schema: generateSchema(value as ZodTypeAny)
      }),
      ...Object.entries(input.query ? input.query._def.shape() : {}).map(
        ([key, value]) => ({
          name: key,
          in: 'query' as const,
          schema: generateSchema(value as ZodTypeAny)
        })
      ),
      ...Object.entries(input.headers || {}).map(([key, value]) => ({
        name: key,
        in: 'header' as ParameterLocation,
        schema: { type: 'string' as const },
        ...value
      }))
    )
  ]

  return {
    ...openApiParams,
    responses,
    params,
    requestBody: {
      content: {
        'application/json': {
          schema: generateSchema(input.body ?? emptySchema)
        }
      }
    },
    handlers,
    input,
    output
  }
}
