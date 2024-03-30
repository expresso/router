import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { z } from 'zod'

export {
  createEndpoint,
  type Endpoint,
  type Handler,
  type EndpointParams,
  type ResponseMap,
  type ResponseDefinition,
} from './lib/create-endpoint'
export { createApi, type Route, type HttpMethod, type Routing } from './lib/create-api'
export { createApp, type OpenApiInfo, type CreateAppParams, type MaybeNestedRouting } from './lib/create-app'

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z)
// Export the extended Zod as `z` for convenience
// Using `z` will allow you to use the extended Zod without conflicting with the original Zod
export { z }
