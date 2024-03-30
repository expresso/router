import { generateSchema } from '@anatine/zod-openapi'
import type * as Express from 'express'
import {
  type HeadersObject,
  type OperationObject,
  type ParameterLocation,
  type ResponseObject,
} from 'openapi3-ts/oas31'
import { type ZodObject, type ZodTypeAny, type z } from 'zod'
import { type NonEmptyObj, type OneOrMore, type ValueOf } from '../types'

export interface ResponseDefinition {
  body: ZodTypeAny
  headers?: HeadersObject
}
export type ResponseMap = Record<string, ResponseDefinition>
export type InferBodyValues<T extends ResponseMap> = {
  [k in keyof T]: z.infer<T[k]['body']>
}

export type Handler<RequestBody = any, Params = any, Query = any, ResponseBody extends ResponseMap = any> = (
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

export type ErrorHandler<RequestBody = any, Params = any, Query = any, ResponseBody extends ResponseMap = any> = (
  err: unknown,
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
  handlers: EndpointParams<RequestBody, Params, Query, ResponseBodies>['handlers']
  errorHandler?: EndpointParams<RequestBody, Params, Query, ResponseBodies>['errorHandler']
  input?: EndpointParams<RequestBody, Params, Query, ResponseBodies>['input']
  output: EndpointParams<RequestBody, Params, Query, ResponseBodies>['output']
}

/**
 * Parameters for creating an endpoint
 * @property [input.body] The body schema that will be validated
 * @property [input.params] The params schema that will be validated
 * @property [input.query] The query schema that will be validated
 * @property [input.headers] The headers schema that will be validated
 * @property output The output schema that will be validated
 * @property handlers The handlers that will be executed, those handlers are not error handlers
 * @property [errorHandler] The error handlers that will be executed after the handlers
 */
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
  output: NonEmptyObj<ResponseBodies, 'Output cannot be empty'>
  handlers: OneOrMore<Handler<RequestBody, Params, Query, ResponseBodies>>
  errorHandler?: ErrorHandler<RequestBody, Params, Query, ResponseBodies>
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
  const { input, output, handlers, errorHandler, ...openApiParams } = definition

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
    errorHandler,
    input,
    output,
  }
}
