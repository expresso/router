import { type Endpoint } from './create-endpoint'

/**
 * Supported HTTP methods
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace'

/**
 * Route definition
 */
export type Route = {
  [k in HttpMethod]?: Endpoint<any, any, any, any>
}

/**
 * Flattened routing object, where the key is the path and the value is the route
 */
export type FlatRouting = Record<string, Route>

/**
 * Removes handlers and spreads endpoint from a route
 * @param param0 Method name and route
 * @returns The route definition
 */
const createRouteDef = ([method, route]: [string, Endpoint<any, any, any, any>]) => {
  const { handlers, input, output, ...endpoint } = route

  return [method, endpoint]
}

/**
 * Converts a dynamic Express route to a dynamic OpenAPI route
 * @param path Express path
 * @returns OpenAPI compatible path
 * @example
 * convertPath('/users/:id') // returns '/users/{id}'
 */
const convertPath = (path: string) => path.replace(/:([^/]+)/g, '{$1}')

/**
 * Morphs a routing object into an OpenAPI compatible spec
 * @param routing Route definitions
 * @returns OpenApi paths
 */
export const createApi = (routing: FlatRouting) => {
  return Object.fromEntries(
    Object.entries(routing).map(([path, route]) => {
      const finalPath = path.includes(':') ? convertPath(path) : path

      return [finalPath, Object.fromEntries(Object.entries(route).map(createRouteDef))]
    }),
  )
}
