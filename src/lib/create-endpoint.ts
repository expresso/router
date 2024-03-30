import { generateSchema } from '@anatine/zod-openapi'
import type * as Express from 'express'
import {
  type HeadersObject,
  type OperationObject,
  type ParameterLocation,
  type ResponseObject,
} from 'openapi3-ts/oas31'
import { type z, type ZodObject, type ZodTypeAny } from 'zod'
import { type ValueOf, type OneOrMore } from '../types'

export interface ResponseDefinition {
  body: ZodTypeAny
  headers?: HeadersObject
}
export type ResponseMap = Record<string, ResponseDefinition>
export type InferBodyValues<T extends ResponseMap> = {
  [k in keyof T]: z.infer<T[k]['body']>
}

export type Handler<RequestBody, Params, Query, ResponseBody extends ResponseMap> = (
  req: Express.Request<Params, ResponseBody, RequestBody, Query>,
  res: Omit<Express.Response<ValueOf<InferBodyValues<ResponseBody>>>, 'status'> & {
    status: <const T extends number>(
      status: T extends keyof ResponseBody ? T : never,
    ) => {
      json: (body: z.output<ResponseBody[typeof status]['body']>) => any
    }
  },
  next: Express.NextFunction,
) => any

export type Endpoint<
  RequestBody = any,
  Params = any,
  Query = any,
  ResponseBodies extends ResponseMap = any,
> = OperationObject & {
  handlers: OneOrMore<Handler<RequestBody, Params, Query, ResponseBodies>>
  input?: {
    body?: ZodObject<any, 'strip', ZodTypeAny, RequestBody, any>
    params?: ZodObject<any, 'strip', ZodTypeAny, Params, any>
    query?: ZodObject<any, 'strip', ZodTypeAny, Query, any>
  }
  output: ResponseBodies
}

export type EndpointParams<
  RequestBody,
  Params,
  Query,
  ResponseBodies extends ResponseMap,
> = Partial<OperationObject> & {
  input?: {
    body?: ZodObject<any, 'strip', ZodTypeAny, RequestBody, any>
    params?: ZodObject<any, 'strip', ZodTypeAny, Params, any>
    query?: ZodObject<any, 'strip', ZodTypeAny, Query, any>
    headers?: HeadersObject
  }
  output: ResponseBodies
  handlers: OneOrMore<Handler<RequestBody, Params, Query, ResponseBodies>>
}

function getResponseFromOutput([status, definition]: [string, ResponseDefinition]): [string, ResponseObject] {
  if (!`${status}`.match(/\d{3}/)) {
    throw new Error(`Invalid status code: ${status}`)
  }

  const response: ResponseObject = {
    description: '',
    content: {
      'application/json': { schema: generateSchema(definition.body) },
    },
  }

  if (definition.headers) {
    response.headers = Object.fromEntries(
      Object.entries(definition.headers).map(([key, value]) => [key, { schema: { type: 'string' }, ...value }]),
    )
  }

  return [status, response]
}

export function createEndpoint<RequestBody, Params, Query, ResponseBodies extends Record<number, ResponseDefinition>>(
  definition: EndpointParams<RequestBody, Params, Query, ResponseBodies>,
): Endpoint<RequestBody, Params, Query, ResponseBodies> {
  const { input, output, handlers, ...openApiParams } = definition

  const responses = Object.fromEntries(Object.entries(output).map(getResponseFromOutput))

  const inputParams: Record<string, unknown> = input?.params ? input.params._def.shape() : {}
  const inputQuery: Record<string, unknown> = input?.query ? input.query._def.shape() : {}
  const params = [
    ...Object.entries(inputParams).map(
      ([key, value]) => ({
        in: 'path' as const,
        name: key,
        required: true,
        schema: generateSchema(value as ZodTypeAny),
      }),
      ...Object.entries(inputQuery).map(([key, value]) => ({
        name: key,
        in: 'query' as const,
        schema: generateSchema(value as ZodTypeAny),
      })),
      ...Object.entries(input?.headers ?? {}).map(([key, value]) => ({
        name: key,
        in: 'header' as ParameterLocation,
        schema: { type: 'string' as const },
        ...value,
      })),
    ),
  ]

  return {
    ...openApiParams,
    responses,
    parameters: params,
    requestBody: input?.body ? { content: { 'application/json': { schema: generateSchema(input.body) } } } : undefined,
    handlers,
    input,
    output,
  }
}
