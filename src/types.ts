export type OneOrMore<T> = T | [T, ...T[]]
export type ValueOf<T> = T[keyof T]
export type NonEmptyObj<T extends Record<string, unknown>, Message extends string = 'Object cannot be empty'> =
  T extends Record<string, never> ? Message : T
