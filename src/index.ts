import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { z } from 'zod'

export * from './lib/create-endpoint'
export * from './lib/create-api'
export * from './lib/create-app'

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z)
// Export the extended Zod as `z` for convenience
// Using `z` will allow you to use the extended Zod without conflicting with the original Zod
export { z }
