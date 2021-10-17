import { Endpoint } from './create-endpoint'

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace'

export type Route = {
  [k in HttpMethod]?: Endpoint<any, any, any, any>
}

export type Routing = {
  [key: string]: Route
}

/**
 * Removes handlers and spreads endpoint from a route
 * @param param0 Method name and route
 * @returns The route definition
 */
const createRouteDef = ([method, route]: [string, Endpoint<any, any, any, any>]) => {
  const { handlers, input, output, outputHeaders,...endpoint } = route

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
export const createApi = (routing: Routing) => {
  return Object.fromEntries(
    Object.entries(routing).map(([path, route]) => {
      const finalPath = path.includes(':') ? convertPath(path) : path

      return [
        finalPath,
        Object.fromEntries(Object.entries(route).map(createRouteDef))
      ]
    })
  )
}
